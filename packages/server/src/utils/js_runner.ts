import { NodeVM } from 'vm2'
import { Request, Response } from 'express'

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

async function JsRunner(code: string, input: any, body: any, res: Response | null=null) {
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
        module.exports = async function(code, input, body, res) {
            ${code}
        }
        `

    try {
        const func = await vm.run(asyncFunctionWrapper, __dirname)
        return func(code, input, body, res)
    } catch (e) {
        console.log(e)
        return null
    }
}

export default JsRunner
