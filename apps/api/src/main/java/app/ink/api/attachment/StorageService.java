package app.ink.api.attachment;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Presigned URLs for the private attachment bucket (AC7). The app uploads and downloads straight to/from
 * the store; the URL is the credential and lives 15 minutes. Works with any S3-compatible store
 * (S3Mock locally, Cloudflare R2 in production) through {@link StorageProperties}.
 */
@Service
@EnableConfigurationProperties(StorageProperties.class)
public class StorageService {

	static final Duration URL_TTL = Duration.ofMinutes(15);

	private final StorageProperties props;
	private final S3Presigner presigner;

	public StorageService(StorageProperties props) {
		this.props = props;
		this.presigner = S3Presigner.builder()
				.endpointOverride(URI.create(props.endpoint()))
				.region(Region.of(props.region()))
				.credentialsProvider(StaticCredentialsProvider
						.create(AwsBasicCredentials.create(props.accessKey(), props.secretKey())))
				.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
				.build();
	}

	/**
	 * A URL the app PUTs the bytes to. Content type and length are signed, so the upload must match the
	 * metadata the API validated.
	 */
	public String uploadUrl(String key, String mimeType, long sizeBytes) {
		PutObjectRequest put = PutObjectRequest.builder()
				.bucket(props.bucket())
				.key(key)
				.contentType(mimeType)
				.contentLength(sizeBytes)
				.build();
		return presigner.presignPutObject(r -> r.signatureDuration(URL_TTL).putObjectRequest(put)).url().toString();
	}

	public String downloadUrl(String key) {
		GetObjectRequest get = GetObjectRequest.builder().bucket(props.bucket()).key(key).build();
		return presigner.presignGetObject(r -> r.signatureDuration(URL_TTL).getObjectRequest(get)).url().toString();
	}

}
