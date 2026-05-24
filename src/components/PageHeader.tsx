interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      style={{ borderBottom: '1px solid #1e1d1a' }}
      className="flex items-center justify-between px-8 py-5"
    >
      <div>
        <h1
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }}
          className="text-3xl tracking-wider"
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: '#8a867d' }} className="text-sm mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
