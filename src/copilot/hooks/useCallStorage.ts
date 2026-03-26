import { useCallback } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { TwilioCallService } from '../services/twilioCallService';

export const useCallStorage = () => {
  const { state, dispatch } = useAgent();
  const storeCall = useCallback(async (callSid: string, leadId: string, isRecordingOverride?: boolean) => {
    const agentId = localStorage.getItem('agentId') || ""; // Fetch active agent ID with fallback

    try {
      const callData = await TwilioCallService.storeCallInDB({
        callSid,
        agentId,
        leadId,
        userId: agentId,
        isRecording: isRecordingOverride !== undefined ? isRecordingOverride : state.callState.isRecording
      });

      if (callData && callData.recording_url_cloudinary) {
        dispatch({ type: 'SET_RECORDING_URL', url: callData.recording_url_cloudinary });
      }
    } catch (error) {
      console.error('Failed to store call in database:', error);
    }
  }, [state.callState.isRecording]);

  return { storeCall };
}; 
