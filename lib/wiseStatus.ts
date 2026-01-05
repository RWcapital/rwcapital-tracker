// lib/wiseStatus.ts

export type WiseStatus =
  | "incoming_payment_waiting"
  | "incoming_payment_received"
  | "processing"
  | "funds_sent"
  | "completed"
  | "cancelled"
  | "failed"
  | "charged_back";

export function mapWiseStatus(status: WiseStatus | string) {
  switch (status) {
    case "incoming_payment_waiting":
      return {
        publicStatus: "PENDING",
        labelES: "Esperando fondos del remitente",
        labelEN: "Waiting for sender funds",
      };

    case "incoming_payment_received":
      return {
        publicStatus: "FUNDS_RECEIVED",
        labelES: "Fondos recibidos",
        labelEN: "Funds received",
      };

    case "processing":
      return {
        publicStatus: "PROCESSING",
        labelES: "Procesando transferencia",
        labelEN: "Processing transfer",
      };

    case "funds_sent":
      return {
        publicStatus: "SENT",
        labelES: "Fondos enviados al banco",
        labelEN: "Funds sent to bank",
      };

    case "completed":
      return {
        publicStatus: "COMPLETED",
        labelES: "Transferencia completada",
        labelEN: "Transfer completed",
      };

    case "cancelled":
      return {
        publicStatus: "CANCELLED",
        labelES: "Transferencia cancelada",
        labelEN: "Transfer cancelled",
      };

    case "failed":
      return {
        publicStatus: "FAILED",
        labelES: "Transferencia fallida",
        labelEN: "Transfer failed",
      };

    case "charged_back":
      return {
        publicStatus: "REVERSED",
        labelES: "Transferencia reversada",
        labelEN: "Transfer reversed",
      };

    default:
      return {
        publicStatus: "UNKNOWN",
        labelES: "Estado actualizado",
        labelEN: "Status updated",
      };
  }
}
