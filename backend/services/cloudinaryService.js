const { v2: cloudinary } = require('cloudinary')
const { randomUUID } = require('node:crypto')

let configured = false

function getCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error('Resume file storage is not configured on the server.')
    error.status = 503
    throw error
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    })
    configured = true
  }

  return cloudinary
}

function uploadBuffer(buffer, { ownerId, format, folder }) {
  const client = getCloudinary()
  const publicId = `${folder}/${ownerId}/${randomUUID()}.${format}`

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream({
      resource_type: 'raw',
      type: 'authenticated',
      access_mode: 'authenticated',
      public_id: publicId,
      unique_filename: false,
      overwrite: false,
      use_filename: false,
    }, (error, result) => {
      if (error) return reject(error)
      if (!result?.public_id) return reject(new Error('Cloudinary did not return an asset identifier.'))
      return resolve({ publicId: result.public_id, bytes: result.bytes })
    })
    stream.end(buffer)
  })
}

async function deleteAsset(publicId) {
  const result = await getCloudinary().uploader.destroy(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    invalidate: true,
  })
  if (!['ok', 'not found'].includes(result.result)) {
    throw new Error('Cloudinary could not confirm asset removal.')
  }
}

function createPrivateDownloadUrl(publicId, format) {
  return getCloudinary().utils.private_download_url(publicId, format, {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: true,
  })
}

async function downloadPrivateAsset(publicId, format) {
  const response = await fetch(createPrivateDownloadUrl(publicId, format), {
    signal: AbortSignal.timeout(30000),
    redirect: 'error',
  })
  if (!response.ok || !response.body) {
    throw new Error('The private resume file could not be downloaded from storage.')
  }
  return response
}

module.exports = {
  deleteAsset,
  downloadPrivateAsset,
  uploadBuffer,
}
