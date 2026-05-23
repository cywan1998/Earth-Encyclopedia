import { Drawer, Tag, Empty, Collapse } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import type { DataPoint, LayerConfig } from '../layers/types'

interface CountryDetailProps {
  open: boolean
  countryName: string
  points: DataPoint[]
  layerConfig: LayerConfig | null
  onClose: () => void
}

const COUNTRY_NAME_ZH: Record<string, string> = {
  'China': '中国', 'Russia': '俄罗斯', 'Australia': '澳大利亚', 'Brazil': '巴西',
  'South Africa': '南非', 'Chile': '智利', 'Peru': '秘鲁', 'Indonesia': '印度尼西亚',
  'Zambia': '赞比亚', 'India': '印度', 'Saudi Arabia': '沙特阿拉伯', 'Iran': '伊朗',
  'Iraq': '伊拉克', 'United States of America': '美国', 'Bolivia': '玻利维亚',
  'Argentina': '阿根廷', 'Guinea': '几内亚', 'Ghana': '加纳', 'Canada': '加拿大',
  'Uzbekistan': '乌兹别克斯坦', 'Nigeria': '尼日利亚', 'Venezuela': '委内瑞拉',
  'Germany': '德国', 'Poland': '波兰', 'Mozambique': '莫桑比克', 'Myanmar': '缅甸',
  'Malaysia': '马来西亚', 'Dem. Rep. Congo': '刚果(金)', 'Congo': '刚果(布)',
  'Tanzania': '坦桑尼亚', 'Kazakhstan': '哈萨克斯坦', 'Mongolia': '蒙古',
  'Philippines': '菲律宾', 'Mexico': '墨西哥', 'Colombia': '哥伦比亚',
  'Qatar': '卡塔尔', 'Sweden': '瑞典', 'Norway': '挪威', 'Ukraine': '乌克兰',
  'Botswana': '博茨瓦纳', 'Angola': '安哥拉', 'Algeria': '阿尔及利亚',
  'Libya': '利比亚', 'Morocco': '摩洛哥', 'Egypt': '埃及', 'Thailand': '泰国',
  'Vietnam': '越南', 'Pakistan': '巴基斯坦', 'Turkmenistan': '土库曼斯坦',
  'Cuba': '古巴', 'New Caledonia': '新喀里多尼亚', 'Gabon': '加蓬',
  'Namibia': '纳米比亚', 'Sierra Leone': '塞拉利昂', 'Zimbabwe': '津巴布韦',
  'Belarus': '白俄罗斯', 'Jordan': '约旦', 'Laos': '老挝', 'Niger': '尼日尔',
  'United Arab Emirates': '阿联酋', 'Kuwait': '科威特', 'Suriname': '苏里南',
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null
  return (
    <div className="mineral-info-row">
      <span className="mineral-info-label">{label}</span>
      <span className="mineral-info-value">{String(value)}</span>
    </div>
  )
}

export default function CountryDetail({ open, countryName, points, layerConfig, onClose }: CountryDetailProps) {
  const zhName = COUNTRY_NAME_ZH[countryName] ?? countryName
  const categories = layerConfig?.categories ?? {}
  const detailFields = layerConfig?.detailFields ?? []

  const byCategory = new Map<string, DataPoint[]>()
  for (const p of points) {
    const list = byCategory.get(p.category) ?? []
    list.push(p)
    byCategory.set(p.category, list)
  }

  return (
    <Drawer
      title={
        <div className="detail-title">
          <EnvironmentOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
          <span>{zhName}</span>
          <span className="detail-title-en">{zhName !== countryName ? countryName : ''}</span>
          <Tag color="blue" style={{ marginLeft: 'auto' }}>{points.length} 个数据点</Tag>
        </div>
      }
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: '12px 16px', background: '#f8fafc' } }}
    >
      {points.length === 0 ? (
        <Empty description="该国家暂无数据" />
      ) : (
        Array.from(byCategory.entries()).map(([category, records]) => {
          const style = categories[category]
          return (
            <div key={category} className="mineral-group">
              <div className="mineral-group-header">
                {style?.icon
                  ? <img src={style.icon} alt={category} className="mineral-type-icon" />
                  : <span className="mineral-type-dot" style={{ background: style?.color ?? '#95a5a6' }} />
                }
                <span className="mineral-type-name">{style?.label ?? category}</span>
                <span className="mineral-type-count">{records.length} 处</span>
              </div>
              <Collapse
                size="small"
                expandIconPosition="end"
                items={records.map(r => ({
                  key: r.id,
                  label: (
                    <div className="mineral-collapse-label">
                      <span className="mineral-card-name">{r.name}</span>
                      {r.properties.reserve_level && (
                        <Tag
                          color={r.properties.reserve_level === '超大型' ? 'gold' : r.properties.reserve_level === '大型' ? 'blue' : 'default'}
                          bordered={false}
                          style={{ marginLeft: 8, fontSize: 11 }}
                        >
                          {String(r.properties.reserve_level)}
                        </Tag>
                      )}
                    </div>
                  ),
                  children: (
                    <div className="mineral-detail-content">
                      {r.properties.description && (
                        <p className="mineral-description">{String(r.properties.description)}</p>
                      )}
                      <div className="mineral-info-grid">
                        {detailFields.map(field => (
                          <InfoRow key={field.key} label={field.label} value={r.properties[field.key]} />
                        ))}
                      </div>
                    </div>
                  ),
                }))}
              />
            </div>
          )
        })
      )}
    </Drawer>
  )
}
