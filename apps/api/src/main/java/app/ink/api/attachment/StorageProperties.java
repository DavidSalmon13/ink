package app.ink.api.attachment;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code app.storage.*}: the S3-compatible attachment store (S3Mock locally, Cloudflare R2 in production).
 * All values come from STORAGE_* environment variables, so switching stores is configuration, not code.
 *
 * @param endpoint  the store's base URL (path-style access)
 * @param region    signing region ({@code auto} for R2)
 * @param bucket    the private bucket holding every attachment
 * @param accessKey access key id
 * @param secretKey secret access key
 */
@ConfigurationProperties("app.storage")
public record StorageProperties(String endpoint, String region, String bucket, String accessKey, String secretKey) {
}
