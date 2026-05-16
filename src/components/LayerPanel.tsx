import { Switch } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import type { LayerState } from '../hooks/useLayers'

interface LayerPanelProps {
  layerStates: LayerState[]
  onToggle: (layerId: string) => void
}

export default function LayerPanel({ layerStates, onToggle }: LayerPanelProps) {
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
                  <span key={item.label} className="legend-item">
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
        点击地图上着色区域查看矿产明细
      </div>
    </div>
  )
}
