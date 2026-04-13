def generate_message(notification_type: str):
    if notification_type == "appointment":
        return "You have a new appointment scheduled."
    
    elif notification_type == "payment":
        return "Your payment has been received successfully.`"
    
    elif notification_type == "reminder":
        return "Reminder: You have an upcoming appointment."
    
    elif notification_type == "update":
        return "Your appointment details have been updated."
    
    else:
        return "You have a new notification."