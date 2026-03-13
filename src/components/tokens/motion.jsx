// Motion tokens for luxury animations
export const duration = {
  fast: 150,
  base: 300,
  slow: 600,
};

export const ease = {
  luxury: [0.16, 1, 0.3, 1], // cubic-bezier for CSS
  luxuryGSAP: "power3.out", // GSAP equivalent
};

export const transition = {
  fast: `${duration.fast}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  base: `${duration.base}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  slow: `${duration.slow}ms cubic-bezier(0.16, 1, 0.3, 1)`,
};