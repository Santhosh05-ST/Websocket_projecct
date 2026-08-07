package org.example.videochat.room.repository;

import org.example.videochat.room.entity.Room;
import org.example.videochat.room.entity.RoomParticipant;
import org.example.videochat.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomParticipantRepository
        extends JpaRepository<RoomParticipant, Long> {

    boolean existsByRoomAndUser(Room room, User user);

    Optional<RoomParticipant> findByRoomAndUser(Room room, User user);

    List<RoomParticipant> findByRoom(Room room);
    void deleteByRoomAndUser(Room room, User user);
    List<RoomParticipant> findByUserUsername(User user);
}