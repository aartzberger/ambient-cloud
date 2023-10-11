import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { CheerioWebBaseLoader, WebBaseLoaderParams } from 'langchain/document_loaders/web/cheerio'
import { test } from 'linkifyjs'
import axios from 'axios'

class Edgar_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Edgar Filings loader'
        this.name = 'edgarFilingLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'edgar.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from Edgar SEC filings`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Company CIK',
                name: 'cik',
                type: 'string'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'N Recent Filings',
                name: 'nFilings',
                type: 'number',
                default: 1
            },
            {
                label: 'Filing Type',
                name: 'filingDocumentType',
                type: 'options',
                description: 'Select the type of document to retrieve',
                options: [
                    {
                        label: '10-K',
                        name: '10-K',
                        description: 'Most recient 10-K filing'
                    },
                    {
                        label: '10-Q',
                        name: '10-Q',
                        description: 'Most recient 10-Q filing'
                    },
                    {
                        label: '8-K',
                        name: '8-K',
                        description: 'Most recient 8-K filing'
                    }
                ],
                optional: false
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const companyCIK = nodeData.inputs?.cik as string
        const filingDocumentType = nodeData.inputs?.filingDocumentType as string
        const nFilings = nodeData.inputs?.nFilings as number

        const fullCIK = companyCIK.padStart(10, '0')

        let params: WebBaseLoaderParams = {}
        async function cheerioLoader(url: string): Promise<any> {
            try {
                let docs = []
                const loader = new CheerioWebBaseLoader(url, params)
                if (textSplitter) {
                    docs = await loader.loadAndSplit(textSplitter)
                } else {
                    docs = await loader.load()
                }
                return docs
            } catch (err) {
                if (process.env.DEBUG === 'true') console.error(`error in CheerioWebBaseLoader: ${err.message}, on page: ${url}`)
            }
        }

        let infoUrl = `https://data.sec.gov/submissions/CIK${fullCIK}.json`
        infoUrl = infoUrl.trim()
        if (!test(infoUrl)) {
            throw new Error('Invalid URL. Could request for CIK number failed.')
        }

        // get all the filings informaitons
        const filingsInfo = await edgarRequest(infoUrl)
        // get the first N number of filings of the given type
        const filingDescriptions = (filingsInfo as any).filings.recent.primaryDocDescription
        let foundIndices: number[] = []
        for (const [index, description] of filingDescriptions.entries()) {
            if (description === filingDocumentType) {
                foundIndices.push(index)
                if (foundIndices.length === nFilings) {
                    break
                }
            }
        }

        const allDocs = []
        for (const index of foundIndices) {
            // get the file name
            const fileName = (filingsInfo as any).filings.recent.primaryDocument[index]
            // get the access number
            const accessNumber = (filingsInfo as any).filings.recent.accessionNumber[index].replace(/-/g, '')
            // make the final docs url
            const documentUrl = `https://www.sec.gov/Archives/edgar/data/${companyCIK}/${accessNumber}/${fileName}`
            let docs = []
            docs = await cheerioLoader(documentUrl)
            allDocs.push(...docs)
        }

        return allDocs
    }
}

module.exports = { nodeClass: Edgar_DocumentLoaders }

const edgarRequest = async (url: string) => {
    const headers = {
        'User-Agent': 'AmbientWare/1.0'
    }

    try {
        const response = await axios.get(url, { headers })
        return response.data
    } catch (error) {
        console.error('Error fetching data:', error)
        // Handle the error as you see fit, e.g., throw it, return a default value, etc.
        throw error
    }
}
