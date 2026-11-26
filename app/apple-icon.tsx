import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F172A',
          borderRadius: 38,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width="180"
          height="180"
        >
          <path
            d="M5 17H19V22H10V29.5H17.5V34.5H10V47H5V17Z"
            fill="#FFFFFF"
          />
          <path
            fillRule="evenodd"
            d="M23 17H31.5C36.2 17 39 20.1 39 25.75C39 31.4 36.2 34.5 31.5 34.5H28V47H23V17ZM28 21.8V29.7H31.2C33.1 29.7 34.2 28.2 34.2 25.75C34.2 23.3 33.1 21.8 31.2 21.8H28Z"
            fill="#FFFFFF"
          />
          <path
            fillRule="evenodd"
            d="M43 17H51.5C56.2 17 59 20.1 59 25.75C59 31.4 56.2 34.5 51.5 34.5H48V47H43V17ZM48 21.8V29.7H51.2C53.1 29.7 54.2 28.2 54.2 25.75C54.2 23.3 53.1 21.8 51.2 21.8H48Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
