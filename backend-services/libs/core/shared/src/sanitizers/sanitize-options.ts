export interface SanitizeOptions {
    /** Trim leading/trailing whitespace. Default: true */
    trim?: boolean;
    /** Convert the value to lower case. Default: false */
    lowercase?: boolean;
    /** Convert the value to upper case. Default: false */
    uppercase?: boolean;
    /** Collapse internal runs of whitespace into a single space. Default: false */
    collapseWhitespace?: boolean;
    /** Strip ASCII control characters, including null bytes. Default: true */
    stripControlChars?: boolean;
    /** Remove duplicate entries (arrays only). Default: false */
    unique?: boolean;
}
