interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E8E6' }}
      className="flex items-center justify-between px-8 py-5"
    >
      <div>
        <h1
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 22, letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: '#6B6B6B' }} className="text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
