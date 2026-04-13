import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI } from '../api/patient';

export default function DoctorSearch() {
  const navigate = useNavigate();
  const [searchDoctorName, setSearchDoctorName] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [searchHospital, setSearchHospital] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
    doSearch();
  }, []);

  useEffect(() => {
    if (searchDoctorName || searchSpecialty || searchHospital) {
      doSearch();
    }
  }, [searchDoctorName, searchSpecialty, searchHospital]);

  const loadFilterOptions = async () => {
    const [specs, hosps] = await Promise.all([
      patientAPI.getSpecializations(),
      patientAPI.getHospitals()
    ]);
    setSpecializations(Array.isArray(specs) ? specs : []);
    setHospitals(Array.isArray(hosps) ? hosps : []);
  };

  const doSearch = async () => {
    setLoading(true);
    const hasFilters = searchDoctorName || searchSpecialty || searchHospital || searchDate;
    const filters = hasFilters ? {
      doctor_name: searchDoctorName,
      specialty: searchSpecialty,
      hospital: searchHospital
    } : {};
    const data = await patientAPI.getDoctors(filters);
    setDoctors(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleViewAll = () => {
    setSearchDoctorName('');
    setSearchSpecialty('');
    setSearchHospital('');
    setSearchDate('');
    doSearch();
  };

  const handleDoctorClick = (doctor) => {
    navigate(`/?doctor=${doctor.id}`);
  };

  const getFilterLabel = () => {
    const parts = [];
    if (searchDoctorName) parts.push(searchDoctorName);
    if (searchSpecialty) parts.push(searchSpecialty);
    if (searchHospital) parts.push(searchHospital);
    if (searchDate) parts.push(searchDate);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                HealthCare
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-left text-xs text-blue-200 mb-1 ml-1">Doctor Name</label>
              <div className="bg-white/10 border border-white/20 rounded-xl flex items-center px-3 py-2">
                <input
                  type="text"
                  placeholder="Dr. Name"
                  value={searchDoctorName}
                  onChange={(e) => setSearchDoctorName(e.target.value)}
                  className="w-full bg-transparent outline-none text-white placeholder-blue-300/60 text-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[140px]">
              <label className="block text-left text-xs text-blue-200 mb-1 ml-1">Specialization</label>
              <div className="bg-white/10 border border-white/20 rounded-xl flex items-center px-3 py-2">
                <select
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                  className="w-full bg-transparent outline-none text-white text-sm cursor-pointer"
                >
                  <option value="" className="text-slate-800">Select</option>
                  {specializations.map(s => (
                    <option key={s} value={s} className="text-slate-800">{s}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-1 min-w-[140px]">
              <label className="block text-left text-xs text-blue-200 mb-1 ml-1">Hospital</label>
              <div className="bg-white/10 border border-white/20 rounded-xl flex items-center px-3 py-2">
                <select
                  value={searchHospital}
                  onChange={(e) => setSearchHospital(e.target.value)}
                  className="w-full bg-transparent outline-none text-white text-sm cursor-pointer"
                >
                  <option value="" className="text-slate-800">Select</option>
                  {hospitals.map(h => (
                    <option key={h} value={h} className="text-slate-800">{h}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-end">
              <button 
                onClick={doSearch} 
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg w-full md:w-auto"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {getFilterLabel() ? `Results for "${getFilterLabel()}"` : 'Available Doctors'}
            </h2>
            <p className="text-gray-500 mt-1">{doctors.length} doctors found</p>
          </div>
          {(searchDoctorName || searchSpecialty || searchHospital) && (
            <button
              onClick={handleViewAll}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              View All Doctors
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-gray-400 text-lg">No doctors found</div>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {doctors.map((doctor) => (
              <div 
                key={doctor.id}
                onClick={() => handleDoctorClick(doctor)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer p-6 group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-105 transition-transform">
                    👨‍⚕️
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {doctor.full_name}
                    </h3>
                    <p className="text-blue-600 font-medium">{doctor.specialty}</p>
                    <p className="text-gray-500 text-sm mt-1">{doctor.qualifications}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      {doctor.hospital && <span>{doctor.hospital}</span>}
                      <span>{doctor.years_of_experience} years</span>
                      <span className="text-green-600 font-semibold">Rs. {doctor.consultation_fee}</span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-full font-medium group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <span>Book Now</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}