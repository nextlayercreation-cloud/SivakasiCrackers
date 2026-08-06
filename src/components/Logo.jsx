// src/components/Logo.jsx

export default function Logo({
  size = 40,
  className = ""
}) {
  return (
    <img
      src="/Logo.png"
      alt="Sivakasi Crackers"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block"
      }}
    />
  );
}