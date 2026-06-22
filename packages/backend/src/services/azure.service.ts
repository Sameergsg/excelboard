import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';

export async function testAzureConnection(connectionString: string): Promise<{ containers: string[] }> {
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const containers: string[] = [];
  for await (const container of client.listContainers()) {
    containers.push(container.name);
  }
  return { containers };
}

export async function listAzureBlobs(
  connectionString: string,
  containerName: string
): Promise<{ name: string; size: number }[]> {
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const container = client.getContainerClient(containerName);
  const blobs: { name: string; size: number }[] = [];
  for await (const blob of container.listBlobsFlat()) {
    if (blob.name.endsWith('.xlsx') || blob.name.endsWith('.xls')) {
      blobs.push({ name: blob.name, size: blob.properties.contentLength || 0 });
    }
  }
  return blobs;
}

export async function downloadAzureBlob(
  connectionString: string,
  containerName: string,
  blobName: string,
  destPath: string
): Promise<void> {
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const container = client.getContainerClient(containerName);
  const blob = container.getBlobClient(blobName);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await blob.downloadToFile(destPath);
}
