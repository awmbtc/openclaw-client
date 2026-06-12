import React, { useState, useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import useAuthStore from '../store/auth'
import { runWorkflow } from '../api'

// 初始演示节点
const initNodes = [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 150 },
    data: { label: '📥 输入节点\n(Input_Node)' },
    style: { background: '#1e2535', color: '#e8eaf0', border: '1px solid #3b4560', borderRadius: 12, padding: 12, fontSize: 13 },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 350, y: 150 },
    data: { label: '🤖 LLM 节点\n(GPT-4o)' },
    style: { background: '#1e2a3a', color: '#e8eaf0', border: '1px solid #4f6ef7', borderRadius: 12, padding: 12, fontSize: 13 },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 600, y: 150 },
    data: { label: '📤 输出节点\n(Output_Node)' },
    style: { background: '#1e2535', color: '#e8eaf0', border: '1px solid #3b4560', borderRadius: 12, padding: 12, fontSize: 13 },
  },
]

const initEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#4f6ef7' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#4f6ef7' } },
]

export default function CanvasPage() {
  const { activeAgent } = useAuthStore()
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#4f6ef7' } }, eds)),
    [setEdges]
  )

  async function handleRun() {
    if (running) return
    setRunning(true)
    setOutput('')
    try {
      // 构建工作流图（演示用简单图）
      const workflowGraph = {
        nodes: [
          { id: '1', type: 'Input_Node',  inputKey: 'user_input', outputKey: 'user_input' },
          { id: '2', type: 'LLM_Node',    prompt: '{{user_input}}', outputKey: 'result' },
          { id: '3', type: 'Output_Node', inputKey: 'result' },
        ]
      }
      const res = await runWorkflow(activeAgent, workflowGraph, { user_input: input })
      setOutput(res.data.output || '（无输出）')
    } catch (err) {
      setOutput(`错误：${err.response?.data?.error || '执行失败'}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* 画布区域 */}
      <div className="relative min-h-[18rem] flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#2a2f3e" gap={20} />
          <Controls style={{ background: '#161b27', border: '1px solid #2a2f3e' }} />
          <MiniMap style={{ background: '#161b27' }} nodeColor="#4f6ef7" />
        </ReactFlow>
      </div>

      {/* 右侧运行面板 */}
      <div className="flex max-h-[42%] shrink-0 flex-col gap-4 overflow-y-auto border-t border-[#2a2f3e] bg-[#161b27] p-4 md:max-h-none md:w-72 md:border-l md:border-t-0">
        <h2 className="text-sm font-semibold text-white">运行工作流</h2>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">输入变量</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
            placeholder="在这里输入内容..."
            className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2f3e] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        <button
          onClick={handleRun}
          disabled={running || !input.trim()}
          className="py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {running ? '执行中...' : '▶ 运行'}
        </button>

        {output && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">输出结果</label>
            <div className="px-3 py-2 bg-[#0f1117] border border-[#2a2f3e] rounded-lg text-sm text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {output}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
