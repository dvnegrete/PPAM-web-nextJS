/**
 * El texto que se le muestra a la persona cuando algo falla.
 *
 * Los errores del servidor ya traen un mensaje redactado para leerse; lo que no
 * es un `Error` —un rechazo con cualquier otra cosa— cae en el texto de respaldo.
 */
export function errorMessage(problem: unknown, fallback: string): string {
  return problem instanceof Error ? problem.message : fallback;
}
