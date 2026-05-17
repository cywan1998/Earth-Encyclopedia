import { Switch } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import type { LayerState } from '../hooks/useLayers'

interface LayerPanelProps {
  layerStates: LayerState[]
  onToggle: (layerId: string) => void
  selectedMineralType: string | null
  onSelectMineralType: (type: string | null) => void
}

export default function LayerPanel({ layerStates, onToggle, selectedMineralType, onSelectMineralType }: LayerPanelProps) {
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
            {visible && config.legend && (
              <div className="layer-legend">
                {config.legend.map(item => (
                  <span
                    key={item.label}
                    className={`legend-item legend-item-clickable${selectedMineralType === item.label ? ' legend-item-active' : ''}${selectedMineralType && selectedMineralType !== item.label ? ' legend-item-dimmed' : ''}`}
                    onClick={() => onSelectMineralType(selectedMineralType === item.label ? null : item.label)}
                  >
                    <span className="legend-dot" style={{ background: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="layer-panel-footer">
        {selectedMineralType
          ? `当前筛选：${selectedMineralType}（点击取消）`
          : '点击矿种图例可筛选，点击地图着色区域查看明细'}
      </div>
    </div>
  )
}
