import { Drawer, Tag, Empty, Collapse } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import type { MineralRecord } from '../layers/types'
import { MINERAL_COLORS } from '../layers/minerals'

interface CountryDetailProps {
  open: boolean
  countryName: string
  minerals: MineralRecord[]
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

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="mineral-info-row">
      <span className="mineral-info-label">{label}</span>
      <span className="mineral-info-value">{value}</span>
    </div>
  )
}

export default function CountryDetail({ open, countryName, minerals, onClose }: CountryDetailProps) {
  const zhName = COUNTRY_NAME_ZH[countryName] ?? countryName

  const byType = new Map<string, MineralRecord[]>()
  for (const m of minerals) {
    const list = byType.get(m.mineral_type) ?? []
    list.push(m)
    byType.set(m.mineral_type, list)
  }

  return (
    <Drawer
      title={
        <div className="detail-title">
          <EnvironmentOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
          <span>{zhName}</span>
          <span className="detail-title-en">{zhName !== countryName ? countryName : ''}</span>
          <Tag color="blue" style={{ marginLeft: 'auto' }}>{minerals.length} 个矿区</Tag>
        </div>
      }
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: '12px 16px', background: '#f8fafc' } }}
    >
      {minerals.length === 0 ? (
        <Empty description="该国家暂无矿产数据" />
      ) : (
        Array.from(byType.entries()).map(([type, records]) => (
          <div key={type} className="mineral-group">
            <div className="mineral-group-header">
              <span className="mineral-type-dot" style={{ background: MINERAL_COLORS[type] ?? '#95a5a6' }} />
              <span className="mineral-type-name">{type}</span>
              <span className="mineral-type-count">{records.length} 处</span>
            </div>
            <Collapse
              size="small"
              expandIconPosition="end"
              items={records.map(r => ({
                key: r.name,
                label: (
                  <div className="mineral-collapse-label">
                    <span className="mineral-card-name">{r.name}</span>
                    <Tag
                      color={r.reserve_level === '超大型' ? 'gold' : r.reserve_level === '大型' ? 'blue' : 'default'}
                      bordered={false}
                      style={{ marginLeft: 8, fontSize: 11 }}
                    >
                      {r.reserve_level}
                    </Tag>
                  </div>
                ),
                children: (
                  <div className="mineral-detail-content">
                    {r.description && <p className="mineral-description">{r.description}</p>}
                    <div className="mineral-info-grid">
                      <InfoRow label="探明储量" value={r.reserves} />
                      <InfoRow label="年产量" value={r.annual_production} />
                      <InfoRow label="品位/质量" value={r.grade} />
                      <InfoRow label="发现年份" value={r.discovery_year} />
                      <InfoRow label="运营方" value={r.operator} />
                      <InfoRow label="开发状态" value={r.status} />
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
        ))
      )}
    </Drawer>
  )
}
