export const metadata = {
title: "i-tags Store",
description: "Apple Find My–compatible trackers",
};

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html lang="en">
<body>{children}</body>
</html>
);
}