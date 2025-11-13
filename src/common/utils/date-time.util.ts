import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

/**
 * Constante para la zona horaria de Bogotá, Colombia
 */
export const BOGOTA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha y hora actual en la zona horaria de Bogotá
 * @returns Date en zona horaria America/Bogota
 */
export function getBogotaDate(): Date {
  const now = new Date();
  // Convertir la fecha actual a la zona horaria de Bogotá
  const bogotaTime = toZonedTime(now, BOGOTA_TIMEZONE);
  return bogotaTime;
}

/**
 * Convierte cualquier fecha a la zona horaria de Bogotá
 * @param date - Fecha a convertir
 * @returns Date en zona horaria America/Bogota
 */
export function toBogotaDate(date: Date): Date {
  return toZonedTime(date, BOGOTA_TIMEZONE);
}

/**
 * Convierte una fecha de Bogotá a UTC para guardar en la base de datos
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
  return format(toBogotaDate(date), formatString, {
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

