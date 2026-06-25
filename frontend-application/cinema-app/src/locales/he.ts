import type en from './en';

// Widen the `as const` literal types of `en` to plain strings while preserving its
// nested key structure, so `he` is forced to provide every key but with its own values.
type DeepWiden<T> = {
    [K in keyof T]: T[K] extends string ? string : DeepWiden<T[K]>;
};

// Hebrew translations — must keep the same key structure as `en` (enforced by the type).
const he: DeepWiden<typeof en> = {
    auth: {
        login: 'התחברות',
        register: 'הרשמה',
        email: 'דוא"ל',
        password: 'סיסמה',
        loginButton: 'כניסה',
        registerButton: 'יצירת חשבון',
        noAccount: 'אין לך חשבון?',
        haveAccount: 'כבר יש לך חשבון?',
        loginSuccess: 'ברוך שובך!',
        logoutButton: 'התנתקות',
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
    },
    reservation: {
        selectSeats: 'לחצו על מקומות כדי לבחור אותם',
        selectedCount: '{{count}} מקומות נבחרו',
        reserve: 'שריון מקומות',
        confirm: 'אישור הזמנה',
        cancel: 'ביטול הזמנה',
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
