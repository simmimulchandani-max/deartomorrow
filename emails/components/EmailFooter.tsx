import { Hr, Text } from "@react-email/components";

type EmailFooterProps = {
  children: React.ReactNode;
};

export default function EmailFooter({ children }: EmailFooterProps) {
  return (
    <>
      <Hr
        style={{
          borderColor: "#eadfce",
          margin: "30px 0 22px",
        }}
      />
      <Text
        style={{
          color: "#7a695f",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "14px",
          lineHeight: "22px",
          margin: "0 0 12px",
          textAlign: "center",
        }}
      >
        {children}
      </Text>
      <Text
        style={{
          color: "#9b8c82",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "12px",
          lineHeight: "18px",
          margin: 0,
          textAlign: "center",
        }}
      >
        With care,
        <br />
        Until Tomorrow
      </Text>
    </>
  );
}
