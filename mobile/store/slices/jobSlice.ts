import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jobService, Job, CreateJobData } from '../../services/jobService';

interface JobState {
  jobs: Job[];
  myJobs: Job[];
  currentJob: Job | null;
  isLoading: boolean; // Global loading (kept for legacy)
  isJobsLoading: boolean;
  isMyJobsLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
}

const initialState: JobState = {
  jobs: [],
  myJobs: [],
  currentJob: null,
  isLoading: false,
  isJobsLoading: false,
  isMyJobsLoading: false,
  isDetailLoading: false,
  error: null,
};

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (filters?: any) => {
    const response = await jobService.getJobs(filters);
    return response;
  }
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id: string) => {
    return await jobService.getJobById(id);
  }
);

export const fetchMyJobs = createAsyncThunk('jobs/fetchMyJobs', async () => {
  return await jobService.getMyJobs();
});

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (data: CreateJobData) => {
    return await jobService.createJob(data);
  }
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, data }: { id: string; data: Partial<CreateJobData> }) => {
    return await jobService.updateJob(id, data);
  }
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (id: string) => {
    await jobService.deleteJob(id);
    return id;
  }
);

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Jobs
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.isJobsLoading = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isJobsLoading = false;
        state.isLoading = false;
        state.jobs = action.payload?.jobs || [];
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isJobsLoading = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch jobs';
      });

    // Fetch Job By ID
    builder
      .addCase(fetchJobById.pending, (state, action) => {
        // Only show loading if we don't have this job cached, or if it's a different job
        const requestedId = String(action.meta.arg);
        if (!state.currentJob || String(state.currentJob.id) !== requestedId) {
          state.isDetailLoading = true;
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.isDetailLoading = false;
        state.isLoading = false;
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.isDetailLoading = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch job';
      });

    // Fetch My Jobs
    builder
      .addCase(fetchMyJobs.pending, (state) => {
        state.isMyJobsLoading = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyJobs.fulfilled, (state, action) => {
        state.isMyJobsLoading = false;
        state.isLoading = false;
        state.myJobs = action.payload;
      })
      .addCase(fetchMyJobs.rejected, (state, action) => {
        state.isMyJobsLoading = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch my jobs';
      });

    // Create Job
    builder
      .addCase(createJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myJobs.unshift(action.payload);
        state.jobs.unshift(action.payload);
      })
      .addCase(createJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create job';
      });

    // Update Job
    builder
      .addCase(updateJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.myJobs.findIndex((j) => j.id === action.payload.id);
        if (index !== -1) {
          state.myJobs[index] = action.payload;
        }
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update job';
      });

    // Delete Job
    builder
      .addCase(deleteJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myJobs = state.myJobs.filter((j) => j.id !== action.payload);
        state.jobs = state.jobs.filter((j) => j.id !== action.payload);
        if (state.currentJob?.id === action.payload) {
          state.currentJob = null;
        }
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete job';
      });
  },
});

export const { clearError, clearCurrentJob } = jobSlice.actions;
export default jobSlice.reducer;

