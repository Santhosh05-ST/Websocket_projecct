package org.example.videochat.websocket.model;

public class SignalMessage {

    public enum SignalType { OFFER, ANSWER, ICE_CANDIDATE }

    private SignalType type;
    private String roomId;
    private String sender;
    private String target;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;

    public SignalMessage() {}

    public SignalType getType() { return type; }
    public void setType(SignalType type) { this.type = type; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }

    public String getSdp() { return sdp; }
    public void setSdp(String sdp) { this.sdp = sdp; }

    public String getCandidate() { return candidate; }
    public void setCandidate(String candidate) { this.candidate = candidate; }

    public String getSdpMid() { return sdpMid; }
    public void setSdpMid(String sdpMid) { this.sdpMid = sdpMid; }

    public Integer getSdpMLineIndex() { return sdpMLineIndex; }
    public void setSdpMLineIndex(Integer sdpMLineIndex) { this.sdpMLineIndex = sdpMLineIndex; }
}