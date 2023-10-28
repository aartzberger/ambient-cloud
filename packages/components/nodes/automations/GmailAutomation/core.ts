import axios from 'axios'
import { refreshAccessToken } from '../../../src/utils'


// -----------------------------------
// TRIGGER METHODS
// -----------------------------------

export async function getUnreadMessages(accessToken: string, mailbox: string, credential: string): Promise<[] | null> {
    try {
        // Fetch unread emails from the inbox
        const response = await axios.get('https://www.googleapis.com/gmail/v1/users/me/messages', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            params: {
                q: `is:unread in:${mailbox}` // Query for unread emails in the inbox
            }
        })

        if (response.data && response.data.messages) {
            return response.data.messages
            // You can further fetch each email's details using the message IDs provided in the response
        }
    } catch {
        const accessToken = await refreshAccessToken(credential)
        if (!accessToken) {
            return null
        }
        const messages = await getUnreadMessages(accessToken, mailbox, credential)
        return messages
    }

    return null
}

export async function getMessageDetails(accessToken: string, messageId: string) {
    try {
        const response = await axios.get(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })

        if (response.data) {
            return response.data
        } else {
            console.log(`No details found for message with ID: ${messageId}.`)
        }
    } catch (error) {
        console.error('The API returned an error:', error.response.data)
    }
}

export function findPlainTextPart(message: any): string | null {
    const parts = message.payload.parts

    for (const part of parts) {
        if (part.mimeType === 'text/plain') {
            const decodedText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')) // decode base64 URL-safe variant to standard base64, then to plain text
            return decodedText // this is base64 encoded
        }

        // If the current part contains other parts (attachments, inline content, etc.), recurse into them.
        if (part.parts) {
            const result = findPlainTextPart(part.parts)
            if (result) return result
        }
    }
    return null
}

export function getSenderAddress(message: any): string | null {
    const headers = message.payload.headers
    const emailRegex = /<([^>]+)>/;
    for (const header of headers) {
        if (header.name === 'From') {
            const fromValue = header.value
            const match = fromValue.match(emailRegex);
            const emailAddress = match ? match[1] : null;
            return emailAddress
        }
    }
    return null
}

// -----------------------------------
// HANDLER METHODS
// -----------------------------------

export async function sendEmail(accessToken: string, to:string, subject: string, body: string, threadId: string) {
    const rawEmail = `To: ${to}\nSubject: ${subject}\nContent-Type: text/plain; charset="UTF-8"\n\n${body}`;
    const encodedEmail = base64UrlSafeEncode(rawEmail);

    try {
        const response = await axios.post('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
            raw: encodedEmail,
            threadId: threadId
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return response.data;
    } catch (error) {
        console.error("Failed to send the email:", error);
        throw error;
    }
}

function base64UrlSafeEncode(str: string) {
    let base64 = btoa(unescape(encodeURIComponent(str)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}