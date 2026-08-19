import { Section, Text, Row, Column } from "@react-email/components";
import { EmailLayout, emailStyles } from "./EmailLayout";

export interface ShippingNoticeEmailProps {
  orderNumber: string;
  trackingNumber: string;
  carrier?: string;
  items: { title: string; quantity: number }[];
  isPartial: boolean;
  orderUrl: string;
}

export function ShippingNoticeEmail({
  orderNumber,
  trackingNumber,
  carrier,
  items,
  isPartial,
  orderUrl,
}: ShippingNoticeEmailProps) {
  return (
    <EmailLayout preview={`${isPartial ? "Part of" : ""} order ${orderNumber} has shipped`}>
      <Text style={emailStyles.heading}>{isPartial ? "Part of your order has shipped" : "Your order has shipped"}</Text>
      <Text style={emailStyles.body}>
        {isPartial
          ? `Some items from ${orderNumber} are on their way — the rest will follow in a separate shipment.`
          : `${orderNumber} is on its way.`}
      </Text>

      <Section style={{ marginTop: "24px" }}>
        <Text style={emailStyles.label}>{carrier ? `${carrier} tracking` : "Tracking number"}</Text>
        <Text style={{ ...emailStyles.lineItem, fontFamily: "monospace", fontSize: "16px" }}>{trackingNumber}</Text>
      </Section>

      <Section style={{ marginTop: "20px" }}>
        <Text style={emailStyles.label}>In this shipment</Text>
        {items.map((item, i) => (
          <Row key={i} style={{ marginTop: "6px" }}>
            <Column>
              <Text style={emailStyles.lineItem}>
                {item.title} × {item.quantity}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Text style={{ ...emailStyles.body, marginTop: "24px" }}>
        Track this order at <a href={orderUrl} style={{ color: "#D2A54F" }}>{orderUrl}</a>.
      </Text>
    </EmailLayout>
  );
}

export default ShippingNoticeEmail;
