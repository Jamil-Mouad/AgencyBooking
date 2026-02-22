package com.project.agent.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.time.DayOfWeek;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

@Entity
@Getter
@Setter
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Agency {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @NotBlank
    private String address;

    @NotBlank
    private String city;

    @NotBlank
    private String phoneNumber;

    @Email
    private String email;

    private String description;

    @ManyToMany
    @JoinTable(
        name = "agency_services",
        joinColumns = @JoinColumn(name = "agency_id"),
        inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    @JsonManagedReference
    private List<ServiceOffering> services = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "agency_business_hours",
                    joinColumns = @JoinColumn(name = "agency_id"))
    private List<BusinessHours> businessHours;

    @OneToMany(mappedBy = "agency", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JsonManagedReference
    private List<Agent> agents;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Agency agency = (Agency) o;
        return id != null && id.equals(agency.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "Agency{id=" + id + ", name='" + name + "'}";
    }

    @Embeddable
    @Getter
    @Setter
    public static class BusinessHours {
        @Enumerated(EnumType.STRING)
        private DayOfWeek day;

        @Column(name = "opening_time")
        private String openingTime;

        @Column(name = "closing_time")
        private String closingTime;

        private boolean closed;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            BusinessHours that = (BusinessHours) o;
            return closed == that.closed &&
                   Objects.equals(day, that.day) &&
                   Objects.equals(openingTime, that.openingTime) &&
                   Objects.equals(closingTime, that.closingTime);
        }

        @Override
        public int hashCode() {
            return Objects.hash(day, openingTime, closingTime, closed);
        }
    }
}
