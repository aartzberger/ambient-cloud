import { NodeVM } from 'vm2'

/*
 * List of dependencies allowed to be import in vm2
 */
const availableDependencies = [
    '@dqbd/tiktoken',
    '@getzep/zep-js',
    '@huggingface/inference',
    '@pinecone-database/pinecone',
    '@supabase/supabase-js',
    'axios',
    'cheerio',
    'chromadb',
    'cohere-ai',
    'd3-dsv',
    'form-data',
    'graphql',
    'html-to-text',
    'langchain',
    'linkifyjs',
    'mammoth',
    'moment',
    'node-fetch',
    'pdf-parse',
    'pdfjs-dist',
    'playwright',
    'puppeteer',
    'srt-parser-2',
    'typeorm',
    'weaviate-ts-client'
]

const defaultAllowBuiltInDep = [
    'assert',
    'buffer',
    'crypto',
    'events',
    'http',
    'https',
    'net',
    'path',
    'querystring',
    'timers',
    'tls',
    'url',
    'zlib'
]

async function JsRunner(code: string, input: string) {
    const vm = new NodeVM({
        console: 'inherit',
        sandbox: {},
        require: {
            external: { modules: availableDependencies },
            builtin: defaultAllowBuiltInDep
        }
    })

    // Now, run the code
    const asyncFunctionWrapper = `
        module.exports = async function(input) {
            ${code}
        }
        `

    const func = await vm.run(asyncFunctionWrapper)

    return func(input)
}

export default JsRunner
