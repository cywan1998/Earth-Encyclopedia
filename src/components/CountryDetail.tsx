import { Drawer, Tag, Empty } from 'antd'
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
  'China': '中国',
  'Russia': '俄罗斯',
  'Australia': '澳大利亚',
  'Brazil': '巴西',
  'South Africa': '南非',
  'Chile': '智利',
  'Peru': '秘鲁',
  'Indonesia': '印度尼西亚',
  'Zambia': '赞比亚',
  'India': '印度',
  'Saudi Arabia': '沙特阿拉伯',
  'Iran': '伊朗',
  'Iraq': '伊拉克',
  'United States of America': '美国',
  'Bolivia': '玻利维亚',
  'Argentina': '阿根廷',
  'Guinea': '几内亚',
  'Ghana': '加纳',
  'Canada': '加拿大',
  'Uzbekistan': '乌兹别克斯坦',
  'Nigeria': '尼日利亚',
  'Venezuela': '委内瑞拉',
  'Germany': '德国',
  'Poland': '波兰',
  'Mozambique': '莫桑比克',
  'Myanmar': '缅甸',
  'Malaysia': '马来西亚',
  'Dem. Rep. Congo': '刚果(金)',
}

const RESERVE_COLOR: Record<string, string> = {
  '超大型': '#f59e0b',
  '大型': '#3b82f6',
  '中型': '#6b7280',
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
      width={400}
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
              <span className="mineral-type-count">{records.length}</span>
            </div>
            {records.map(r => (
              <div key={r.name} className="mineral-card">
                <div className="mineral-card-name">{r.name}</div>
                <div className="mineral-card-meta">
                  <Tag color={RESERVE_COLOR[r.reserve_level] ?? '#6b7280'} bordered={false}>{r.reserve_level}</Tag>
                  <span className="mineral-card-status" data-status={r.status}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </Drawer>
  )
}
