def get_response(user_input):
    user_input = user_input.lower()

    if "صداع" in user_input or "وجع راس" in user_input:
        return "أنصحك تروح لدكتور مخ وأعصاب (Neurologist)."

    elif "سخونية" in user_input or "حرارة" in user_input:
        return "ممكن تكون إنفلونزا. يفضل تروح لطبيب باطنة (Internal Medicine)."

    elif "حجز" in user_input or "موعد" in user_input:
        return "تقدر تحجز من خلال صفحة الحجز في الموقع أو التطبيق."

    elif "أنف" in user_input or "أذن" in user_input:
        return "دكتور أنف وأذن متاح بكرة الساعة 5 مساءً. تحب أحجزلك؟"

    else:
        return "أنا مساعد طبي ذكي بسيط، اسألني عن أعراض أو حجز مواعيد."
