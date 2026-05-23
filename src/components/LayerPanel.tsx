import { Switch } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import type { LayerState } from '../hooks/useLayers'

interface LayerPanelProps {
  layerStates: LayerState[]
  onToggle: (layerId: string) => void
  selectedCategory: string | null
  onSelectCategory: (type: string | null) => void
}

export default function LayerPanel({ layerStates, onToggle, selectedCategory, onSelectCategory }: LayerPanelProps) {
  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <div className="layer-panel-logo">
          <GlobalOutlined className="layer-panel-icon" />
          <div>
            <h2>Earth</h2>
            <p>全球数据百科</p>
          </div>
        </div>
      </div>
      <div className="layer-panel-section-title">数据图层</div>
      <div className="layer-list">
        {layerStates.map(({ config, visible }) => (
          <div key={config.id} className="layer-item">
            <div className="layer-item-header">
              <span className="layer-item-name">{config.name}</span>
              <Switch
                size="small"
                checked={visible}
                onChange={() => onToggle(config.id)}
              />
            </div>
            <div className="layer-item-desc">{config.description}</div>
            {visible && config.categories && (
              <div className="layer-legend">
                {Object.entries(config.categories).map(([key, style]) => (
                  <span
                    key={key}
                    className={`legend-item legend-item-clickable${selectedCategory === key ? ' legend-item-active' : ''}${selectedCategory && selectedCategory !== key ? ' legend-item-dimmed' : ''}`}
                    onClick={() => onSelectCategory(selectedCategory === key ? null : key)}
                  >
                    {style.icon
                      ? <img src={style.icon} alt={style.label} className="legend-icon" />
                      : <span className="legend-dot" style={{ background: style.color }} />
                    }
                    {style.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="layer-panel-footer">
        {selectedCategory
          ? `当前筛选：${selectedCategory}（点击取消）`
          : '点击图例可筛选，点击地图着色区域查看明细'}
      </div>
    </div>
  )
}
