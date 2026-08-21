import * as React from "react";
import { Body, Container, Head, Html, Preview, Section, Text, Hr, Font } from "@react-email/components";
import type { ReactNode } from "react";

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Georgia"
          fallbackFontFamily="serif"
          webFont={undefined}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#0B0E11", fontFamily: "Georgia, serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto", padding: "0 24px" }}>
          <Section style={{ marginBottom: "32px" }}>
            <Text style={{ color: "#D2A54F", fontSize: "20px", letterSpacing: "2px", margin: 0 }}>VAULT</Text>
          </Section>
          {children}
          <Hr style={{ borderColor: "#2A323C", margin: "32px 0 16px" }} />
          <Text style={{ color: "#5C6B7A", fontSize: "12px" }}>
            VAULT · This is a transactional email about an order you placed.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: { color: "#EDF0F3", fontSize: "24px", fontStyle: "italic", margin: "0 0 16px" },
  body: { color: "#AEB9C4", fontSize: "14px", lineHeight: "1.6" },
  label: { color: "#8492A0", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "1px" },
  lineItem: { color: "#D6DCE2", fontSize: "14px", margin: "4px 0" },
  total: { color: "#EDF0F3", fontSize: "16px", fontWeight: 600 as const },
};
