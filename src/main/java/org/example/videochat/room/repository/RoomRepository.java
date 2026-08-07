package org.example.videochat.room.repository;

import org.example.videochat.room.entity.Room;
import org.example.videochat.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByRoomCode(String roomCode);


    boolean existsByRoomCode(String roomCode);
}