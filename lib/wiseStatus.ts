export type WiseStatus =
  | "incoming_payment_waiting"
  | "incoming_payment_received"
  | "processing"
  | "funds_sent"
  | "completed"
  | "cancelled"
  | "failed"
  | "charged_back";

export function mapWiseStatus(status: WiseStatus) {
  switch (status) {
    case "incoming_payment_waiting":
      return {
        publicStatus: "PENDING",
        es: "Esperando fondos del remitente",
        en: "Waiting for sender funds",
      };

    case "incoming_payment_received":
      return {
        publicStatus: "FUNDS_RECEIVED",
        es: "Fondos recibidos",
        en: "Funds received",
      };

    case "processing":
      return {
        publicStatus: "PROCESSING",
        es: "Procesando transferencia",
        en: "Processing transfer",
      };

    case "funds_sent":
      return {
        publicStatus: "SENT",
        es: "Fondos enviados al banco",
        en: "Funds sent to bank",
      };

    case "completed":
      return {
        publicStatus: "COMPLETED",
        es: "Transferencia completada",
        en: "Transfer completed",
      };

    case "cancelled":
      return {
        publicStatus: "CANCELLED",
        es: "Transferencia cancelada",
        en: "Transfer cancelled",
      };

    case "failed":
      return {
        publicStatus: "FAILED",
        es: "Transferencia fallida",
        en: "Transfer failed",
      };

    case "charged_back":
      return {
        publicStatus: "REVERSED",
        es: "Transferencia reversada",
        en: "Transfer reversed",
      };

    default:
      return {
        publicStatus: "UNKNOWN",
        es: "Estado desconocido",
        en: "Unknown status",
      };
  }
}
