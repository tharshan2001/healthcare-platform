import json
import hashlib
from typing import Optional
from openai import OpenAI, OpenAIError
from uuid import uuid4

from .config import settings
from .database import cache
from .schemas.symptom import (
    SymptomInput,
    PossibleCondition,
    FollowUpQuestion,
    TriageResult,
    TriagePriority,
    AlertType,
)


SYSTEM_PROMPT = """You are a medical triage assistant AI designed to help patients understand their symptoms and guide them to appropriate care. Your role is to:

1. Analyze reported symptoms and provide possible conditions (ranked by likelihood)
2. Assess the severity of the situation on a scale of 1-10
3. Recommend the appropriate medical specialty for consultation
4. Identify emergency situations that require immediate medical attention
5. Generate relevant follow-up questions to gather more information
6. Provide a triage priority level (1=critical, 2=urgent, 3=moderate, 4=low, 5=routine)

CRITICAL GUIDELINES:
- NEVER provide definitive diagnoses
- ALWAYS recommend consulting a healthcare professional
- Err on the side of caution for potentially serious symptoms
- Flag any symptoms that could indicate a life-threatening condition
- Be empathetic and clear in your communication
- Consider the patient's age, gender, and medical history when relevant

EMERGENCY SYMPTOMS TO WATCH FOR:
- Chest pain or pressure
- Difficulty breathing or shortness of breath
- Sudden severe headache
- Signs of stroke (facial drooping, arm weakness, speech difficulty)
- Severe bleeding or trauma
- Loss of consciousness
- Severe allergic reactions
- Suicidal thoughts or self-harm
- Severe abdominal pain
- High fever with stiff neck

OUTPUT FORMAT (JSON):
{
    "possible_conditions": [
        {
            "condition_name": "string",
            "likelihood": "high|moderate|low",
            "likelihood_score": 0.0-1.0,
            "description": "string",
            "matching_symptoms": ["symptom1", "symptom2"]
        }
    ],
    "recommended_specialty": "string",
    "severity_score": 1-10,
    "is_emergency": true|false,
    "triage_priority": "1|2|3|4|5",
    "triage_reasoning": "string",
    "recommended_timeframe": "string",
    "follow_up_questions": [
        {
            "question_id": "string",
            "question_text": "string",
            "question_type": "text|yes_no|multiple_choice",
            "options": ["option1", "option2"] or null,
            "required": true|false
        }
    ],
    "ai_reasoning": "string",
    "confidence_score": 0.0-1.0
}"""

EMERGENCY_CHECK_PROMPT = """You are an emergency triage assistant. Quickly assess if the provided symptoms indicate a medical emergency.

CRITICAL EMERGENCY INDICATORS:
- Chest pain, pressure, or tightness
- Difficulty breathing or severe shortness of breath
- Signs of stroke (FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency)
- Severe bleeding that won't stop
- Loss of consciousness or confusion
- Severe allergic reaction (anaphylaxis)
- Severe head injury or trauma
- Poisoning or overdose
- Suicidal ideation or self-harm
- Seizures
- Severe burns
- Pregnancy complications with bleeding or severe pain

OUTPUT FORMAT (JSON):
{
    "is_emergency": true|false,
    "alert_type": "critical|urgent|warning" or null,
    "triggered_symptoms": ["symptom1", "symptom2"],
    "emergency_instructions": "string",
    "recommended_action": "string",
    "call_emergency_services": true|false
}"""


SPECIALTY_MAPPING = {
    "headache": "Neurology",
    "migraine": "Neurology",
    "dizziness": "Neurology",
    "chest pain": "Cardiology",
    "heart": "Cardiology",
    "palpitations": "Cardiology",
    "breathing": "Pulmonology",
    "cough": "Pulmonology",
    "asthma": "Pulmonology",
    "stomach": "Gastroenterology",
    "abdominal": "Gastroenterology",
    "digestive": "Gastroenterology",
    "skin": "Dermatology",
    "rash": "Dermatology",
    "acne": "Dermatology",
    "bone": "Orthopedics",
    "joint": "Orthopedics",
    "muscle": "Orthopedics",
    "eye": "Ophthalmology",
    "vision": "Ophthalmology",
    "ear": "ENT",
    "nose": "ENT",
    "throat": "ENT",
    "mental": "Psychiatry",
    "anxiety": "Psychiatry",
    "depression": "Psychiatry",
    "diabetes": "Endocrinology",
    "thyroid": "Endocrinology",
    "hormone": "Endocrinology",
    "urinary": "Urology",
    "kidney": "Urology",
    "reproductive": "Gynecology",
    "menstrual": "Gynecology",
    "allergy": "Allergy & Immunology",
    "immune": "Allergy & Immunology",
}


class AIEngine:
    """AI-powered symptom analysis engine using OpenAI."""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize OpenAI client if API key is available."""
        if settings.OPENAI_API_KEY:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def _get_cache_key(self, data: str) -> str:
        """Generate a cache key from input data."""
        return f"symptom_analysis:{hashlib.md5(data.encode()).hexdigest()}"
    
    def _check_emergency_keywords(self, symptoms: list[SymptomInput] | list[str]) -> tuple[bool, list[str]]:
        """
        Quick check for emergency keywords in symptoms.
        Returns (is_emergency, triggered_keywords).
        """
        triggered = []
        emergency_keywords = settings.emergency_keywords_list
        
        for symptom in symptoms:
            symptom_text = symptom.symptom_name.lower() if isinstance(symptom, SymptomInput) else symptom.lower()
            description = getattr(symptom, 'description', '') or ''
            full_text = f"{symptom_text} {description}".lower()
            
            for keyword in emergency_keywords:
                if keyword in full_text:
                    triggered.append(keyword)
        
        return bool(triggered), list(set(triggered))
    
    async def analyze_symptoms(
        self,
        symptoms: list[SymptomInput],
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        medical_history: Optional[list[str]] = None,
        current_medications: Optional[list[str]] = None,
    ) -> dict:
        """
        Analyze symptoms using OpenAI GPT-4.
        Returns structured analysis including possible conditions, severity, and recommendations.
        """
        is_emergency, emergency_keywords = self._check_emergency_keywords(symptoms)
        
        symptoms_text = self._format_symptoms_for_prompt(symptoms)
        
        cache_key = self._get_cache_key(symptoms_text)
        cached_result = cache.get(cache_key)
        if cached_result and not is_emergency:
            return json.loads(cached_result)
        
        patient_context = self._build_patient_context(
            patient_age, patient_gender, medical_history, current_medications
        )
        
        user_prompt = f"""Please analyze the following symptoms and provide a comprehensive assessment:

SYMPTOMS:
{symptoms_text}

{patient_context}

Please provide your analysis in the specified JSON format. Remember to:
1. List possible conditions ranked by likelihood
2. Assess severity (1-10)
3. Recommend appropriate medical specialty
4. Flag if this is an emergency
5. Provide triage priority
6. Generate relevant follow-up questions
7. Explain your reasoning"""

        try:
            if not self.client:
                return self._generate_fallback_analysis(symptoms, is_emergency, emergency_keywords)
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=settings.OPENAI_TEMPERATURE,
                max_tokens=settings.OPENAI_MAX_TOKENS,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            result["tokens_used"] = response.usage.total_tokens
            result["model_used"] = settings.OPENAI_MODEL
            
            if is_emergency and not result.get("is_emergency"):
                result["is_emergency"] = True
                result["severity_score"] = max(result.get("severity_score", 7), 8)
                result["triage_priority"] = "1"
            
            if not is_emergency:
                cache.set(cache_key, json.dumps(result), ttl=1800)
            
            return result
            
        except OpenAIError as e:
            return self._generate_fallback_analysis(symptoms, is_emergency, emergency_keywords, str(e))
        except json.JSONDecodeError:
            return self._generate_fallback_analysis(symptoms, is_emergency, emergency_keywords)
    
    async def check_emergency(self, symptoms: list[str], patient_id: Optional[str] = None) -> dict:
        """
        Quick emergency check for provided symptoms.
        Returns emergency status and instructions.
        """
        is_emergency, triggered = self._check_emergency_keywords(symptoms)
        
        if is_emergency:
            return {
                "is_emergency": True,
                "alert_type": AlertType.CRITICAL.value,
                "triggered_symptoms": triggered,
                "emergency_instructions": self._get_emergency_instructions(triggered),
                "recommended_action": "Call emergency services (911) immediately or go to the nearest emergency room",
                "call_emergency_services": True
            }
        
        try:
            if not self.client:
                return self._generate_non_emergency_response(symptoms)
            
            symptoms_text = "\n".join(f"- {s}" for s in symptoms)
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": EMERGENCY_CHECK_PROMPT},
                    {"role": "user", "content": f"Please assess these symptoms for emergency:\n{symptoms_text}"}
                ],
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
            
        except (OpenAIError, json.JSONDecodeError):
            return self._generate_non_emergency_response(symptoms)
    
    async def generate_follow_up_questions(
        self, 
        symptoms: list[SymptomInput],
        existing_answers: Optional[list[dict]] = None
    ) -> list[FollowUpQuestion]:
        """
        Generate context-aware follow-up questions based on symptoms.
        """
        base_questions = [
            FollowUpQuestion(
                question_id=f"q_{uuid4().hex[:8]}",
                question_text="When did you first notice these symptoms?",
                question_type="text",
                options=None,
                required=True
            ),
            FollowUpQuestion(
                question_id=f"q_{uuid4().hex[:8]}",
                question_text="Have you taken any medication for these symptoms?",
                question_type="yes_no",
                options=["Yes", "No"],
                required=True
            ),
            FollowUpQuestion(
                question_id=f"q_{uuid4().hex[:8]}",
                question_text="Have you experienced these symptoms before?",
                question_type="yes_no",
                options=["Yes", "No"],
                required=True
            ),
        ]
        
        symptom_names = [s.symptom_name.lower() for s in symptoms]
        
        if any("pain" in s for s in symptom_names):
            base_questions.append(FollowUpQuestion(
                question_id=f"q_{uuid4().hex[:8]}",
                question_text="How would you describe the pain?",
                question_type="multiple_choice",
                options=["Sharp", "Dull", "Throbbing", "Burning", "Aching", "Stabbing"],
                required=True
            ))
        
        if any("headache" in s for s in symptom_names):
            base_questions.append(FollowUpQuestion(
                question_id=f"q_{uuid4().hex[:8]}",
                question_text="Does light or noise make your headache worse?",
                question_type="yes_no",
                options=["Yes", "No"],
                required=False
            ))
        
        if any("fever" in s or "temperature" in s for s in symptom_names):
            base_questions.append(FollowUpQuestion(
                question_id=f"q_{uuid4().hex[:8]}",
                question_text="What is your current temperature (if measured)?",
                question_type="text",
                options=None,
                required=False
            ))
        
        return base_questions[:5]
    
    def calculate_triage_priority(self, severity_score: int, is_emergency: bool) -> TriageResult:
        """
        Calculate triage priority based on severity and emergency status.
        """
        if is_emergency or severity_score >= 9:
            return TriageResult(
                priority=TriagePriority.CRITICAL,
                priority_label="Critical",
                reasoning="Symptoms indicate a potentially life-threatening condition requiring immediate attention",
                recommended_timeframe="Immediately - Call emergency services"
            )
        elif severity_score >= 7:
            return TriageResult(
                priority=TriagePriority.URGENT,
                priority_label="Urgent",
                reasoning="Symptoms are severe and require prompt medical evaluation",
                recommended_timeframe="Within 2-4 hours"
            )
        elif severity_score >= 5:
            return TriageResult(
                priority=TriagePriority.MODERATE,
                priority_label="Moderate",
                reasoning="Symptoms require medical attention but are not immediately life-threatening",
                recommended_timeframe="Within 24 hours"
            )
        elif severity_score >= 3:
            return TriageResult(
                priority=TriagePriority.LOW,
                priority_label="Low",
                reasoning="Symptoms are mild to moderate and can be addressed during regular office hours",
                recommended_timeframe="Within 2-3 days"
            )
        else:
            return TriageResult(
                priority=TriagePriority.ROUTINE,
                priority_label="Routine",
                reasoning="Symptoms are mild and may resolve on their own or with basic self-care",
                recommended_timeframe="Within 1-2 weeks or as needed"
            )
    
    def recommend_specialty(self, symptoms: list[SymptomInput], conditions: list[dict]) -> str:
        """
        Recommend a medical specialty based on symptoms and conditions.
        """
        symptom_text = " ".join(s.symptom_name.lower() for s in symptoms)
        
        for keyword, specialty in SPECIALTY_MAPPING.items():
            if keyword in symptom_text:
                return specialty
        
        return "General Practice"
    
    def _format_symptoms_for_prompt(self, symptoms: list[SymptomInput]) -> str:
        """Format symptoms into a readable string for the AI prompt."""
        lines = []
        for i, symptom in enumerate(symptoms, 1):
            line = f"{i}. {symptom.symptom_name}"
            details = []
            if symptom.severity:
                details.append(f"severity: {symptom.severity}/10")
            if symptom.duration:
                details.append(f"duration: {symptom.duration}")
            if symptom.body_location:
                details.append(f"location: {symptom.body_location}")
            if symptom.onset_type:
                details.append(f"onset: {symptom.onset_type}")
            if symptom.description:
                details.append(f"description: {symptom.description}")
            if details:
                line += f" ({', '.join(details)})"
            lines.append(line)
        return "\n".join(lines)
    
    def _build_patient_context(
        self,
        age: Optional[int],
        gender: Optional[str],
        history: Optional[list[str]],
        medications: Optional[list[str]]
    ) -> str:
        """Build patient context string for the prompt."""
        parts = []
        if age:
            parts.append(f"Patient Age: {age}")
        if gender:
            parts.append(f"Patient Gender: {gender}")
        if history:
            parts.append(f"Medical History: {', '.join(history)}")
        if medications:
            parts.append(f"Current Medications: {', '.join(medications)}")
        
        if parts:
            return "PATIENT CONTEXT:\n" + "\n".join(parts)
        return ""
    
    def _get_emergency_instructions(self, triggered_symptoms: list[str]) -> str:
        """Get emergency instructions based on triggered symptoms."""
        instructions = []
        
        if any(kw in triggered_symptoms for kw in ["chest pain", "heart attack"]):
            instructions.append("For chest pain: Stay calm, sit or lie down, chew an aspirin if not allergic, and call emergency services immediately.")
        
        if any(kw in triggered_symptoms for kw in ["difficulty breathing", "shortness of breath"]):
            instructions.append("For breathing difficulty: Sit upright, try to stay calm, loosen any tight clothing, and call emergency services.")
        
        if "stroke" in triggered_symptoms or any(kw in triggered_symptoms for kw in ["numbness", "confusion"]):
            instructions.append("For stroke symptoms: Note the time symptoms started (important for treatment), do not eat or drink, and call emergency services immediately.")
        
        if any(kw in triggered_symptoms for kw in ["severe bleeding"]):
            instructions.append("For severe bleeding: Apply direct pressure with a clean cloth, keep the injured area elevated if possible, and call emergency services.")
        
        if any(kw in triggered_symptoms for kw in ["suicidal", "self-harm"]):
            instructions.append("If you're having thoughts of self-harm, please reach out to a crisis helpline immediately. You are not alone.")
        
        if not instructions:
            instructions.append("Your symptoms may indicate a serious condition. Please seek immediate medical attention.")
        
        return " ".join(instructions)
    
    def _generate_fallback_analysis(
        self, 
        symptoms: list[SymptomInput],
        is_emergency: bool,
        emergency_keywords: list[str],
        error: Optional[str] = None
    ) -> dict:
        """Generate a fallback analysis when AI is unavailable."""
        avg_severity = sum(s.severity or 5 for s in symptoms) / len(symptoms)
        severity_score = min(10, max(1, int(avg_severity + (2 if is_emergency else 0))))
        
        specialty = self.recommend_specialty(symptoms, [])
        triage = self.calculate_triage_priority(severity_score, is_emergency)
        
        return {
            "possible_conditions": [
                {
                    "condition_name": "Unable to determine - AI analysis unavailable",
                    "likelihood": "unknown",
                    "likelihood_score": 0.0,
                    "description": "Please consult a healthcare provider for proper evaluation",
                    "matching_symptoms": [s.symptom_name for s in symptoms]
                }
            ],
            "recommended_specialty": specialty,
            "severity_score": severity_score,
            "is_emergency": is_emergency,
            "triage_priority": triage.priority.value,
            "triage_reasoning": triage.reasoning,
            "recommended_timeframe": triage.recommended_timeframe,
            "follow_up_questions": [],
            "ai_reasoning": f"AI analysis unavailable. {error or 'Using fallback assessment based on symptom keywords.'}",
            "confidence_score": 0.3,
            "tokens_used": 0,
            "model_used": "fallback"
        }
    
    def _generate_non_emergency_response(self, symptoms: list[str]) -> dict:
        """Generate a non-emergency response when AI is unavailable."""
        return {
            "is_emergency": False,
            "alert_type": None,
            "triggered_symptoms": [],
            "emergency_instructions": "Based on initial assessment, your symptoms do not appear to be an emergency. However, if symptoms worsen or you feel concerned, please seek medical attention.",
            "recommended_action": "Monitor your symptoms and consult a healthcare provider if they persist or worsen",
            "call_emergency_services": False
        }


ai_engine = AIEngine()
