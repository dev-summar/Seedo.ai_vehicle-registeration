const axios = require('axios');

/**
 * Surepass RC verification service (Sandbox: POST /rc/rc-full).
 * All configuration from environment variables; token never exposed to frontend.
 *
 * Expected env:
 * - SUREPASS_BASE_URL  e.g. https://sandbox.surepass.io/api/v1 (path /rc/rc-full appended)
 *   OR SUREPASS_API_URL (full URL, legacy)
 * - SUREPASS_TOKEN     Bearer token (or SUREPASS_API_KEY for legacy)
 */
const baseUrl = (process.env.SUREPASS_BASE_URL || '').trim().replace(/\/$/, '');
const legacyFullUrl = (process.env.SUREPASS_API_URL || '').trim();
const SUREPASS_BASE_URL = baseUrl || legacyFullUrl;
const SUREPASS_TOKEN = (process.env.SUREPASS_TOKEN || process.env.SUREPASS_API_KEY || '').trim();

const isProduction = process.env.NODE_ENV === 'production';

if (!SUREPASS_BASE_URL || !SUREPASS_TOKEN) {
  if (!isProduction) {
    console.warn('[Surepass] Missing SUREPASS_BASE_URL (or SUREPASS_API_URL) or SUREPASS_TOKEN in environment');
  }
}

const BACKEND_DOWN_MESSAGE =
  'Vehicle data provider is temporarily unavailable. Please try again later.';

/**
 * Normalize owner name for comparison (trim, collapse spaces, lowercase).
 */
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Resolve user-facing message from Surepass response.
 * If message_code === 'backend_down', return user-friendly message.
 */
function getSurepassErrorMessage(data) {
  if (!data || typeof data !== 'object') return 'Surepass verification failed';
  const messageCode = data.message_code || data.messageCode;
  if (messageCode === 'backend_down') {
    return BACKEND_DOWN_MESSAGE;
  }
  return (
    data.message ||
    data.msg ||
    data.error ||
    (typeof messageCode === 'string' ? messageCode : null) ||
    'Surepass verification failed'
  );
}

/**
 * Call Surepass RC Full API: POST {baseUrl}/rc/rc-full
 * Request body: { id_number: "<RC_NUMBER>" }
 * Token sent as Authorization: Bearer <token> (server-side only).
 *
 * @param {{ rc_number: string, owner_name?: string }} params
 * @returns {Promise<{ rc_number, owner_name, vehicle_number, ... }>}
 */
async function verifyRc(params) {
  const rcNumber = String(params.rc_number || '').trim();

  if (!SUREPASS_BASE_URL || !SUREPASS_TOKEN) {
    const err = new Error('Surepass configuration missing');
    err.code = 'SUREPASS_CONFIG_MISSING';
    throw err;
  }

  if (!rcNumber) {
    const err = new Error('RC number is required for Surepass verification');
    err.code = 'SUREPASS_BAD_REQUEST';
    throw err;
  }

  const url = baseUrl ? `${baseUrl}/rc/rc-full` : legacyFullUrl;

  try {
    const response = await axios.post(
      url,
      { id_number: rcNumber },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUREPASS_TOKEN}`,
        },
        timeout: 10000,
      }
    );

    const data = response && response.data ? response.data : null;

    if (!data) {
      const err = new Error('Empty response from Surepass');
      err.code = 'SUREPASS_EMPTY_RESPONSE';
      throw err;
    }

    const result = data.data && typeof data.data === 'object' ? data.data : data;

    if (data.success !== true || data.status_code !== 200) {
      const message = getSurepassErrorMessage(data);
      const err = new Error(message);
      err.code = 'SUREPASS_VERIFICATION_FAILED';
      throw err;
    }

    const normalized = {
      rc_number: result.rc_number || rcNumber,
      owner_name:
        result.owner_name ||
        result.owner ||
        result.ownerName ||
        '', // Never use user input; Surepass only
      vehicle_number: result.rc_number || '',
      vehicle_type:
        result.vehicle_category_description ||
        result.body_type ||
        result.vehicle_category ||
        '',
      vehicle_class: result.vehicle_category || result.body_type || '',
      fuel_type: result.fuel_type || '',
      manufacturer:
        result.manufacturer ||
        result.maker_description ||
        result.maker ||
        '',
      model: result.model || result.maker_model || '',
      registration_date: result.registration_date || result.manufacturing_date_formatted || '',
      insurance_valid_till: result.insurance_upto || '',
      raw: data,
    };

    if (!normalized.rc_number) {
      normalized.rc_number = rcNumber;
    }

    return normalized;
  } catch (error) {
    if (error.code === 'SUREPASS_CONFIG_MISSING' || error.code === 'SUREPASS_BAD_REQUEST') {
      throw error;
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const err = new Error('Surepass request timed out');
      err.code = 'SUREPASS_TIMEOUT';
      throw err;
    }

    if (error.response) {
      const body = error.response.data || {};
      const message =
        body.message_code === 'backend_down'
          ? BACKEND_DOWN_MESSAGE
          : getSurepassErrorMessage(body) ||
            (error.response.status === 401
              ? 'Invalid or expired Surepass API token'
              : error.response.status === 404
                ? 'RC not found'
                : `Surepass error (${error.response.status})`);
      const err = new Error(message);
      err.code = 'SUREPASS_HTTP_ERROR';
      err.status = error.response.status;
      throw err;
    }

    const err = new Error('Unable to reach Surepass service');
    err.code = 'SUREPASS_NETWORK_ERROR';
    throw err;
  }
}

module.exports = {
  verifyRc,
  normalizeName,
};
