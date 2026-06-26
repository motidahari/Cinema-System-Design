import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@mui/material';

const LANGS = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'he', label: 'עברית', short: 'HE' },
] as const;

type LangCode = (typeof LANGS)[number]['code'];

function applyDirection(lang: LangCode): void {
    const dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
}

export interface LanguageSwitcherProps {
    color?: 'inherit' | 'primary' | 'secondary';
}

export default function LanguageSwitcher({ color = 'inherit' }: LanguageSwitcherProps) {
    const { i18n } = useTranslation();
    const current = (i18n.language as LangCode) || 'en';
    const next = LANGS.find((l) => l.code !== current) ?? LANGS[0];

    const toggle = (): void => {
        void i18n.changeLanguage(next.code);
        applyDirection(next.code);
    };

    return (
        <Tooltip title={next.label}>
            <Button
                color={color}
                onClick={toggle}
                aria-label={`Switch to ${next.label}`}
                size="small"
                sx={{
                    minWidth: 48,
                    fontWeight: 700,
                    letterSpacing: 1,
                    border: '1px solid',
                    borderColor: color === 'inherit' ? 'rgba(255,255,255,0.4)' : 'divider',
                    borderRadius: 1.5,
                    px: 1,
                    '&:hover': {
                        borderColor: color === 'inherit' ? 'rgba(255,255,255,0.8)' : 'primary.main',
                        bgcolor: color === 'inherit' ? 'rgba(255,255,255,0.1)' : undefined,
                    },
                }}
            >
                {current.toUpperCase()}
            </Button>
        </Tooltip>
    );
}
