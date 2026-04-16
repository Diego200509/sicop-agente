"use client";

type FormattedDateProps = {
  value: string | null | undefined;
  fallback?: string;
};

export function FormattedDate({ value, fallback = "Sin fecha" }: FormattedDateProps) {
  if (value == null || value === "") {
    return <span>{fallback}</span>;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return <span>{fallback}</span>;
  }

  return <time dateTime={value}>{d.toLocaleString("es-ES")}</time>;
}
