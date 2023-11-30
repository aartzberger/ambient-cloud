import { INode, INodeParams } from '../../../src/Interface'

class Note_Annotations implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    nodeType?: string | undefined

    constructor() {
        this.label = 'Note'
        this.name = 'noteAnnotation'
        this.version = 2.0
        this.type = 'NoteAnnotation'
        this.nodeType = 'annotationNode'
        this.category = 'Annotations'
        this.icon = 'note.svg'
        this.description = `Make a note on the canvas.`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Note',
                name: 'text',
                type: 'string',
                rows: 5,
                optional: true
            }
        ]
    }
}

module.exports = { nodeClass: Note_Annotations }
