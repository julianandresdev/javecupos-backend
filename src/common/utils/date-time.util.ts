import { fromZonedTime, format } from 'date-fns-tz';

/**
 * Constante para la zona horaria de Bogotá, Colombia
 */
export const BOGOTA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha y hora actual en la zona horaria de Bogotá
 * @returns Date en zona horaria America/Bogota
 */
export function getBogotaDate(): Date {
  // Con process.env.TZ = 'America/Bogota' configurado en main.ts,
  // new Date() ya devuelve la hora de Bogotá correctamente
  return new Date();
}

/**
 * Obtiene la fecha y hora actual en la zona horaria de Bogotá como string formateado
 * Útil para guardar en campos varchar de la base de datos
 * @param formatString - Formato deseado (por defecto: yyyy-MM-dd HH:mm:ss)
 * @returns String formateado en zona horaria de Bogotá
 */
export function getBogotaDateString(formatString: string = "yyyy-MM-dd HH:mm:ss"): string {
  return format(new Date(), formatString, {
    timeZone: BOGOTA_TIMEZONE,
  });
}

/**
 * Convierte una fecha de Bogotá a UTC para guardar en la base de datos
 * Útil cuando necesitas convertir fechas de la zona horaria de Bogotá a UTC
 * @param date - Fecha en zona horaria de Bogotá
 * @returns Date en UTC
 */
export function bogotaToUtc(date: Date): Date {
  return fromZonedTime(date, BOGOTA_TIMEZONE);
}

/**
 * Formatea una fecha en la zona horaria de Bogotá
 * @param date - Fecha a formatear
 * @param formatString - Formato deseado (por defecto: ISO string)
 * @returns String formateado
 */
export function formatBogotaDate(
  date: Date,
  formatString: string = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
): string {
  return format(date, formatString, {
    timeZone: BOGOTA_TIMEZONE,
  });
}

/**
 * Crea una nueva fecha sumando minutos a la fecha actual de Bogotá
 * @param minutes - Minutos a sumar
 * @returns Date en zona horaria America/Bogota
 */
export function getBogotaDatePlusMinutes(minutes: number): Date {
  const now = getBogotaDate();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

/**
 * Crea una nueva fecha sumando milisegundos a la fecha actual de Bogotá
 * @param milliseconds - Milisegundos a sumar
 * @returns Date en zona horaria America/Bogota
 */
export function getBogotaDatePlusMilliseconds(milliseconds: number): Date {
  const now = getBogotaDate();
  return new Date(now.getTime() + milliseconds);
}

