import type en from './en';

type DeepWiden<T> = {
    [K in keyof T]: T[K] extends string ? string : DeepWiden<T[K]>;
};

const he: DeepWiden<typeof en> = {
    auth: {
        login: 'התחברות',
        register: 'הרשמה',
        email: 'דוא"ל',
        password: 'סיסמה',
        confirmPassword: 'אימות סיסמה',
        passwordMismatch: 'הסיסמאות אינן תואמות',
        invalidEmail: 'יש להזין כתובת דוא"ל תקינה',
        loginButton: 'כניסה',
        registerButton: 'יצירת חשבון',
        noAccount: 'אין לך חשבון?',
        haveAccount: 'כבר יש לך חשבון?',
        loginSuccess: 'ברוך שובך!',
        logoutButton: 'התנתקות',
        registerSuccess: 'החשבון נוצר בהצלחה',
        loginFailed: 'הכניסה נכשלה',
        registerFailed: 'ההרשמה נכשלה',
    },
    cinema: {
        title: 'הזמנת מקומות בקולנוע',
        screen: 'מסך',
        legend: {
            available: 'פנוי',
            selected: 'נבחר',
            reserved: 'משוריין',
            booked: 'תפוס',
        },
        stats: {
            available: '{{count}} פנויים',
            reserved: '{{count}} משוריינים',
            booked: '{{count}} תפוסים',
        },
        reservationRestored: 'הזמנה פעילה שוחזרה. תוכל לאשר או לבטל אותה.',
        bookingRestored: 'יש לך הזמנה מאושרת. תוכל לבטל אותה כדי לשחרר את המקומות.',
        loadFailed: 'טעינת ההזמנות נכשלה',
    },
    reservation: {
        selectSeats: 'לחצו על מקומות כדי לבחור אותם',
        selectedCount: '{{count}} מקומות נבחרו',
        reserve: 'שריון מקומות',
        confirm: 'אישור הזמנה',
        cancel: 'ביטול הזמנה',
        cancelBooking: 'ביטול הזמנה',
        clearSelection: 'ניקוי בחירה',
        expiresIn: 'פג תוקף בעוד:',
        expired: 'תוקף ההזמנה שלך פג',
        confirmed: 'ההזמנה אושרה!',
        cancelled: 'ההזמנה בוטלה',
        errors: {
            notConsecutive: 'יש לבחור מקומות רצופים באותה שורה',
            isolatedSeat: 'הבחירה שלך תשאיר מקום ריק מבודד',
            unavailable: 'מקום אחד או יותר שנבחרו אינם זמינים עוד',
        },
    },
};

export default he;
