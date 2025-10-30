/**
 * AI Availability Banner Component
 * Displays a banner when AI features are unavailable or require download
 * Shows setup instructions and indicates when mock provider is being used
 */

import type { AIAvailability } from '../services/ai';

export interface AIAvailabilityBannerProps {
  availability: AIAvailability;
}

/**
 * Checks if any AI API is unavailable
 */
function hasUnavailableAPIs(availability: AIAvailability): boolean {
  return (
    availability.promptAPI === 'unavailable' ||
    availability.summarizerAPI === 'unavailable' ||
    availability.rewriterAPI === 'unavailable'
  );
}

/**
 * Checks if any AI API requires download
 */
function hasDownloadableAPIs(availability: AIAvailability): boolean {
  return (
    availability.promptAPI === 'after-download' ||
    availability.summarizerAPI === 'after-download' ||
    availability.rewriterAPI === 'after-download'
  );
}

/**
 * AI Availability Banner component
 */
export function AIAvailabilityBanner({ availability }: AIAvailabilityBannerProps) {
  const isUnavailable = hasUnavailableAPIs(availability);
  const needsDownload = hasDownloadableAPIs(availability);

  // Check if only Prompt API is unavailable (common in extension contexts)
  const onlyPromptUnavailable =
    availability.promptAPI === 'unavailable' &&
    availability.summarizerAPI === 'available' &&
    availability.rewriterAPI === 'available';

  // Don't show banner if all APIs are available
  if (!isUnavailable && !needsDownload) {
    return null;
  }

  // Don't show banner if only Prompt API is unavailable (expected in extensions)
  if (onlyPromptUnavailable) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: '12px 16px',
        margin: '16px',
        borderRadius: '12px',
        backgroundColor: isUnavailable ? 'rgba(251, 146, 60, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        border: isUnavailable
          ? '1px solid rgba(251, 146, 60, 0.3)'
          : '1px solid rgba(59, 130, 246, 0.3)',
        color: 'var(--text)',
        fontSize: '13px',
        lineHeight: '1.5',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon */}
        <div
          style={{
            flexShrink: 0,
            width: '20px',
            height: '20px',
            marginTop: '2px',
          }}
        >
          {isUnavailable ? (
            // Warning icon
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                stroke="#fb923c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Info icon
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M10 11V15M10 7H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {isUnavailable ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#fb923c' }}>
                AI Features Unavailable
              </div>
              <div style={{ marginBottom: '8px' }}>
                AI features require Chrome 128 or later with Gemini Nano enabled. The extension will
                use a mock provider to demonstrate functionality with example outputs.
              </div>
              <a
                href="https://developer.chrome.com/docs/ai/built-in"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#fb923c',
                  textDecoration: 'underline',
                  fontWeight: 500,
                }}
              >
                View setup instructions →
              </a>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#3b82f6' }}>
                AI Model Download Required
              </div>
              <div style={{ marginBottom: '8px' }}>
                Some AI features require downloading the Gemini Nano model. The download will start
                automatically when you use AI features. This may take a few minutes.
              </div>
              <a
                href="https://developer.chrome.com/docs/ai/built-in"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'underline',
                  fontWeight: 500,
                }}
              >
                Learn more →
              </a>
            </>
          )}
        </div>
      </div>

      {/* API Status Details */}
      {isUnavailable && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '12px',
            color: 'var(--muted)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>API Status:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Prompt API:</span>
              <span
                style={{
                  color:
                    availability.promptAPI === 'available'
                      ? '#10b981'
                      : availability.promptAPI === 'after-download'
                        ? '#3b82f6'
                        : '#fb923c',
                }}
              >
                {availability.promptAPI === 'available'
                  ? '✓ Available'
                  : availability.promptAPI === 'after-download'
                    ? '↓ Download Required'
                    : '✗ Unavailable'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Summarizer API:</span>
              <span
                style={{
                  color:
                    availability.summarizerAPI === 'available'
                      ? '#10b981'
                      : availability.summarizerAPI === 'after-download'
                        ? '#3b82f6'
                        : '#fb923c',
                }}
              >
                {availability.summarizerAPI === 'available'
                  ? '✓ Available'
                  : availability.summarizerAPI === 'after-download'
                    ? '↓ Download Required'
                    : '✗ Unavailable'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Rewriter API:</span>
              <span
                style={{
                  color:
                    availability.rewriterAPI === 'available'
                      ? '#10b981'
                      : availability.rewriterAPI === 'after-download'
                        ? '#3b82f6'
                        : '#fb923c',
                }}
              >
                {availability.rewriterAPI === 'available'
                  ? '✓ Available'
                  : availability.rewriterAPI === 'after-download'
                    ? '↓ Download Required'
                    : '✗ Unavailable'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
