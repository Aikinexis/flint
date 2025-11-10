/**
 * Tests for message handling in panel.tsx
 * Specifically tests the PING_PANEL message handling logic
 */

import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock chrome APIs
const mockOnMessageAddListener = jest.fn();
const mockOnMessageRemoveListener = jest.fn();
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageOnChangedAddListener = jest.fn();
const mockStorageOnChangedRemoveListener = jest.fn();

global.chrome = {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
    onChanged: {
      addListener: mockStorageOnChangedAddListener,
      removeListener: mockStorageOnChangedRemoveListener,
    },
  },
  runtime: {
    onMessage: {
      addListener: mockOnMessageAddListener,
      removeListener: mockOnMessageRemoveListener,
    },
    sendMessage: jest.fn(),
  },
} as any;

// Mock the panel component - we'll import it after setting up mocks
let Panel: any;

describe('Panel Message Handling', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorageGet.mockResolvedValue({ 'flint.lastTab': 'home' });
    mockStorageSet.mockResolvedValue(undefined);
    
    // Dynamically import Panel after mocks are set up
    const module = await import('../../src/panel/panel');
    Panel = module.default || module.Panel;
  });

  describe('PING_PANEL message handling', () => {
    it('should respond to PING_PANEL message before source filter', async () => {
      render(<Panel />);

      // Wait for message listener to be registered
      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      // Get the registered message listener
      const messageListener = mockOnMessageAddListener.mock.calls[0][0];

      // Create a mock sendResponse function
      const mockSendResponse = jest.fn();

      // Send PING_PANEL message WITHOUT background-relay source
      const message = {
        type: 'PING_PANEL',
      };

      const result = messageListener(message, {}, mockSendResponse);

      // Should respond immediately
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Panel is open' },
      });

      // Should return true to keep channel open
      expect(result).toBe(true);
    });

    it('should respond to PING_PANEL even without background-relay source', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // Send PING_PANEL from content script directly (no source field)
      const message = {
        type: 'PING_PANEL',
        source: 'content-script', // Different source
      };

      messageListener(message, {}, mockSendResponse);

      // Should still respond (PING_PANEL is handled before source filter)
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Panel is open' },
      });
    });

    it('should not log PING_PANEL messages', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const message = {
        type: 'PING_PANEL',
      };

      messageListener(message, {}, mockSendResponse);

      // Should NOT log PING_PANEL messages
      const logCalls = consoleSpy.mock.calls.map(call => call.join(' '));
      const hasPingLog = logCalls.some(call => 
        call.includes('PING_PANEL') && call.includes('Received message')
      );
      expect(hasPingLog).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Other messages with source filter', () => {
    it('should require background-relay source for OPEN_GENERATE_TAB', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // Send OPEN_GENERATE_TAB without background-relay source
      const message = {
        type: 'OPEN_GENERATE_TAB',
        source: 'content-script',
      };

      const result = messageListener(message, {}, mockSendResponse);

      // Should NOT respond (filtered out by source check)
      expect(mockSendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle OPEN_GENERATE_TAB with background-relay source', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // Send OPEN_GENERATE_TAB with background-relay source
      const message = {
        type: 'OPEN_GENERATE_TAB',
        source: 'background-relay',
        payload: { text: 'Test text' },
      };

      const result = messageListener(message, {}, mockSendResponse);

      // Should respond
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Opened Generate tab' },
      });
      expect(result).toBe(true);
    });

    it('should require background-relay source for OPEN_SUMMARY_TAB', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // Send without background-relay source
      const message = {
        type: 'OPEN_SUMMARY_TAB',
        source: 'direct',
      };

      const result = messageListener(message, {}, mockSendResponse);

      // Should NOT respond
      expect(mockSendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should require background-relay source for OPEN_REWRITE_TAB', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // Send without background-relay source
      const message = {
        type: 'OPEN_REWRITE_TAB',
      };

      const result = messageListener(message, {}, mockSendResponse);

      // Should NOT respond (no source field means it's not from background-relay)
      expect(mockSendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should log non-PING messages', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const message = {
        type: 'OPEN_GENERATE_TAB',
        source: 'background-relay',
      };

      messageListener(message, {}, mockSendResponse);

      // Should log non-PING messages
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Panel] Received message:',
          expect.objectContaining({ type: 'OPEN_GENERATE_TAB' })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Message handling order', () => {
    it('should handle PING_PANEL before checking source', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // PING_PANEL with no source should still work
      const pingMessage = {
        type: 'PING_PANEL',
      };

      messageListener(pingMessage, {}, mockSendResponse);
      expect(mockSendResponse).toHaveBeenCalledTimes(1);

      mockSendResponse.mockClear();

      // PING_PANEL with wrong source should still work
      const pingMessageWrongSource = {
        type: 'PING_PANEL',
        source: 'wrong-source',
      };

      messageListener(pingMessageWrongSource, {}, mockSendResponse);
      expect(mockSendResponse).toHaveBeenCalledTimes(1);
    });

    it('should filter other messages by source after PING_PANEL check', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // Non-PING message without background-relay source should be filtered
      const otherMessage = {
        type: 'OPEN_GENERATE_TAB',
        source: 'content-script',
      };

      const result = messageListener(otherMessage, {}, mockSendResponse);

      // Should not respond (filtered by source check)
      expect(mockSendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle PING_PANEL with additional payload fields', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const message = {
        type: 'PING_PANEL',
        payload: { extra: 'data' },
        source: 'anywhere',
      };

      messageListener(message, {}, mockSendResponse);

      // Should still respond correctly
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Panel is open' },
      });
    });

    it('should handle rapid PING_PANEL messages', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse1 = jest.fn();
      const mockSendResponse2 = jest.fn();
      const mockSendResponse3 = jest.fn();

      const message = { type: 'PING_PANEL' };

      // Send multiple PING messages rapidly
      messageListener(message, {}, mockSendResponse1);
      messageListener(message, {}, mockSendResponse2);
      messageListener(message, {}, mockSendResponse3);

      // All should respond
      expect(mockSendResponse1).toHaveBeenCalledTimes(1);
      expect(mockSendResponse2).toHaveBeenCalledTimes(1);
      expect(mockSendResponse3).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown message types', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const message = {
        type: 'UNKNOWN_MESSAGE_TYPE',
        source: 'background-relay',
      };

      const result = messageListener(message, {}, mockSendResponse);

      // Should not respond to unknown message types
      expect(mockSendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle message with missing type field', async () => {
      render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const message = {
        source: 'background-relay',
      } as any;

      const result = messageListener(message, {}, mockSendResponse);

      // Should not crash, just not respond
      expect(mockSendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('Listener cleanup', () => {
    it('should remove message listener on unmount', async () => {
      const { unmount } = render(<Panel />);

      await waitFor(() => {
        expect(mockOnMessageAddListener).toHaveBeenCalled();
      });

      const messageListener = mockOnMessageAddListener.mock.calls[0][0];

      // Unmount component
      unmount();

      // Should remove the listener
      await waitFor(() => {
        expect(mockOnMessageRemoveListener).toHaveBeenCalledWith(messageListener);
      });
    });
  });
});
