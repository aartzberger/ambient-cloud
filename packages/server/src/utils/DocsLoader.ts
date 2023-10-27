import { JSONLoader } from 'langchain/document_loaders/fs/json'
import { CSVLoader } from 'langchain/document_loaders/fs/csv'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'
import { NotionLoader } from 'langchain/document_loaders/fs/notion'
import { SRTLoader } from 'langchain/document_loaders/fs/srt'
import { TextLoader } from 'langchain/document_loaders/fs/text'

// Create a TypeScript Map
export const DocumentLoaders = new Map<
    string,
    typeof JSONLoader | typeof CSVLoader | typeof PDFLoader | typeof DocxLoader | typeof NotionLoader | typeof SRTLoader | typeof TextLoader
>()

// Add entries to the map
DocumentLoaders.set('json', JSONLoader)
DocumentLoaders.set('csv', CSVLoader)
DocumentLoaders.set('pdf', PDFLoader)
DocumentLoaders.set('docx', DocxLoader)
DocumentLoaders.set('notion', NotionLoader)
DocumentLoaders.set('srt', SRTLoader)
DocumentLoaders.set('txt', TextLoader)

export const getFileName = (fileBase64: any) => {
    let fileNames = []
    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
        const files = JSON.parse(fileBase64)
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            fileNames.push(filename)
        }
        return fileNames.join(', ')
    } else {
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
        return filename
    }
}
