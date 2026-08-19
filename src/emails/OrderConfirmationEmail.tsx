import { Section, Text, Row, Column } from "@react-email/components";
import { EmailLayout, emailStyles } from "./EmailLayout";

export interface OrderConfirmationEmailProps {
  orderNumber: string;
  items: { title: string; quantity: number; lineTotalFormatted: string }[];
  totalFormatted: string;
  orderUrl: string;
}

export function OrderConfirmationEmail({ orderNumber, items, totalFormatted, orderUrl }: OrderConfirmationEmailProps) {
  return (
    <EmailLayout preview={`Order ${orderNumber} confirmed`}>
      <Text style={emailStyles.heading}>Order confirmed</Text>
      <Text style={emailStyles.body}>
        Thanks for your order. {orderNumber} is confirmed and will move to fulfilment shortly.
      </Text>

      <Section style={{ marginTop: "24px" }}>
        <Text style={emailStyles.label}>Items</Text>
        {items.map((item, i) => (
          <Row key={i} style={{ marginTop: "6px" }}>
            <Column>
              <Text style={emailStyles.lineItem}>
                {item.title} × {item.quantity}
              </Text>
            </Column>
            <Column align="right">
              <Text style={emailStyles.lineItem}>{item.lineTotalFormatted}</Text>
            </Column>
          </Row>
        ))}
        <Row style={{ marginTop: "12px", borderTop: "1px solid #2A323C", paddingTop: "12px" }}>
          <Column>
            <Text style={emailStyles.total}>Total</Text>
          </Column>
          <Column align="right">
            <Text style={emailStyles.total}>{totalFormatted}</Text>
          </Column>
        </Row>
      </Section>

      <Text style={{ ...emailStyles.body, marginTop: "24px" }}>
        Track this order at <a href={orderUrl} style={{ color: "#D2A54F" }}>{orderUrl}</a>.
      </Text>
    </EmailLayout>
  );
}

export default OrderConfirmationEmail;
