// lib/wiseStatus.ts

export type WiseStatus =
  | "transfer.created"
  | "incoming_payment_waiting"
  | "incoming_payment_received"
  | "funds_converted"
  | "processing"
  | "funds_sent"
  | "outgoing_payment_sent"
  | "outgoing_payment_failed"
  | "outgoing_payment_rejected"
  | "completed"
  | "cancelled"
  | "failed"
  | "charged_back"
  | "bounced_back"
  | "funds_refunded";

export function mapWiseStatus(status: WiseStatus | string) {
  switch (status) {
    case "transfer.created":
      return {
        publicStatus: "CREATED",
        labelES: "El remitente ha creado tu transferencia",
        labelEN: "The sender created your transfer",
      };

    case "incoming_payment_waiting":
      return {
        publicStatus: "PENDING",
        labelES: "Esperando fondos del remitente",
        labelEN: "Waiting for sender funds",
      };

    case "incoming_payment_received":
      return {
        publicStatus: "FUNDS_RECEIVED",
        labelES: "Hemos recibido los fondos del remitente",
        labelEN: "Funds received from sender",
      };

    case "funds_converted":
      return {
        publicStatus: "PROCESSING",
        labelES: "Fondos convertidos, preparando el envío",
        labelEN: "Funds converted, preparing payout",
      };

    case "processing":
      return {
        publicStatus: "PROCESSING",
        labelES: "Tu dinero está en camino",
        labelEN: "Your money is on the way",
      };

    case "funds_sent":
      return {
        publicStatus: "SENT",
        labelES: "El dinero se ha enviado al banco",
        labelEN: "Funds sent to the bank",
      };

    case "outgoing_payment_sent":
      return {
        publicStatus: "SENT",
        labelES: "El dinero se mueve a través de la red bancaria",
        labelEN: "Money is moving through the banking network",
      };

    case "outgoing_payment_failed":
      return {
        publicStatus: "FAILED",
        labelES: "El banco rechazó el pago saliente",
        labelEN: "Outgoing payment failed at bank",
      };

    case "outgoing_payment_rejected":
      return {
        publicStatus: "FAILED",
        labelES: "El banco rechazó el pago",
        labelEN: "Outgoing payment was rejected",
      };

    case "completed":
      return {
        publicStatus: "COMPLETED",
        labelES: "Tu dinero debería haber llegado a tu banco",
        labelEN: "Your money should have arrived at your bank",
      };

    case "cancelled":
      return {
        publicStatus: "CANCELLED",
        labelES: "La transferencia fue cancelada",
        labelEN: "Transfer cancelled",
      };

    case "failed":
      return {
        publicStatus: "FAILED",
        labelES: "La transferencia falló",
        labelEN: "Transfer failed",
      };

    case "charged_back":
      return {
        publicStatus: "REVERSED",
        labelES: "La transferencia fue revertida",
        labelEN: "Transfer reversed",
      };

    case "bounced_back":
      return {
        publicStatus: "REVERSED",
        labelES: "Los fondos rebotaron y fueron devueltos",
        labelEN: "Funds bounced back and were returned",
      };

    case "funds_refunded":
      return {
        publicStatus: "REVERSED",
        labelES: "Fondos reembolsados al remitente",
        labelEN: "Funds refunded to sender",
      };

    default:
      return {
        publicStatus: "UNKNOWN",
        labelES: "Estado actualizado",
        labelEN: "Status updated",
      };
  }
}

