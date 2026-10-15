import { useTheme } from '../context/useTheme'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  const { theme } = useTheme()

  return (
    <img
      className={className}
      src={theme === 'light' ? '/Logo_Full_Light.png' : '/Logo_Full.png'}
      alt="WakePulse"
    />
  )
}
