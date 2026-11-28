import '@testing-library/jest-dom'

import { afterEach } from 'vitest'
import { resetRateLimits } from '@/lib/rateLimit'

// Each test starts with fresh rate-limit counters.
afterEach(() => resetRateLimits())
