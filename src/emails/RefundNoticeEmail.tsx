import { Section, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./EmailLayout";

export interface RefundNoticeEmailProps {
  orderNumber: string;
  amountFormatted: string;
  isFullRefund: boolean;
  reason?: string;
  orderUrl: string;
}

export function RefundNoticeEmail({ orderNumber, amountFormatted, isFullRefund, reason, orderUrl }: RefundNoticeEmailProps) {
  return (
    <EmailLayout preview={`${amountFormatted} refunded for order ${orderNumber}`}>
      <Text style={emailStyles.heading}>{isFullRefund ? "Order refunded" : "Partial refund issued"}</Text>
      <Text style={emailStyles.body}>
        {amountFormatted} has been refunded to your original payment method for order {orderNumber}. It typically
        takes 5–10 business days to appear on your statement.
      </Text>

      {reason && (
        <Section style={{ marginTop: "20px" }}>
          <Text style={emailStyles.label}>Reason</Text>
          <Text style={emailStyles.lineItem}>{reason}</Text>
        </Section>
      )}

      <Text style={{ ...emailStyles.body, marginTop: "24px" }}>
        View this order at <a href={orderUrl} style={{ color: "#D2A54F" }}>{orderUrl}</a>.
      </Text>
    </EmailLayout>
  );
}

export default RefundNoticeEmail;
