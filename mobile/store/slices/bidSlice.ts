import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bidService, Bid, CreateBidData } from '../../services/bidService';

interface BidState {
  bids: Bid[];
  myBids: Bid[];
  jobBids: Bid[];
  currentBid: Bid | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BidState = {
  bids: [],
  myBids: [],
  jobBids: [],
  currentBid: null,
  isLoading: false,
  error: null,
};

export const fetchJobBids = createAsyncThunk(
  'bids/fetchJobBids',
  async (jobId: string) => {
    return await bidService.getJobBids(jobId);
  }
);

export const fetchMyBids = createAsyncThunk('bids/fetchMyBids', async () => {
  return await bidService.getMyBids();
});

export const fetchBidById = createAsyncThunk(
  'bids/fetchBidById',
  async (id: string) => {
    return await bidService.getBidById(id);
  }
);

export const createBid = createAsyncThunk(
  'bids/createBid',
  async (data: CreateBidData, { rejectWithValue }) => {
    try {
      return await bidService.createBid(data);
    } catch (error: any) {
      // Backend error response formatını ilet: { error: { message: "..." }, success: false }
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      }
      return rejectWithValue({ error: { message: error.message } });
    }
  }
);

// ... (updates to other thunks if needed, but focusing on createBid) ...



export const acceptBid = createAsyncThunk('bids/acceptBid', async (id: string) => {
  return await bidService.acceptBid(id);
});

export const rejectBid = createAsyncThunk('bids/rejectBid', async (id: string) => {
  return await bidService.rejectBid(id);
});

export const withdrawBid = createAsyncThunk(
  'bids/withdrawBid',
  async (id: string) => {
    return await bidService.withdrawBid(id);
  }
);

export const deleteBid = createAsyncThunk('bids/deleteBid', async (id: string) => {
  await bidService.deleteBid(id);
  return id;
});

const bidSlice = createSlice({
  name: 'bids',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBid: (state) => {
      state.currentBid = null;
    },
    clearJobBids: (state) => {
      state.jobBids = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch Job Bids
    builder
      .addCase(fetchJobBids.pending, (state) => {
        if (state.jobBids.length === 0) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchJobBids.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobBids = action.payload;
      })
      .addCase(fetchJobBids.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch bids';
      });

    // Fetch My Bids
    builder
      .addCase(fetchMyBids.pending, (state) => {
        if (state.myBids.length === 0) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchMyBids.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBids = action.payload;
      })
      .addCase(fetchMyBids.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch my bids';
      });

    // Fetch Bid By ID
    builder
      .addCase(fetchBidById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBidById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBid = action.payload;
      })
      .addCase(fetchBidById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch bid';
      });

    // Create Bid
    builder
      .addCase(createBid.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBid.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobBids.unshift(action.payload);
        state.myBids.unshift(action.payload);
      })
      .addCase(createBid.rejected, (state, action) => {
        state.isLoading = false;
        // action.payload should be the data passed to rejectWithValue
        const payload = action.payload as any;
        if (payload && payload.error && payload.error.message) {
          state.error = payload.error.message;
        } else if (payload && payload.message) {
          state.error = payload.message;
        } else {
          state.error = action.error.message || 'Failed to create bid';
        }
      });

    // Update Bid
    builder
      .addCase(updateBid.fulfilled, (state, action) => {
        const index = state.myBids.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.myBids[index] = action.payload;
        }
        const jobBidIndex = state.jobBids.findIndex(
          (b) => b.id === action.payload.id
        );
        if (jobBidIndex !== -1) {
          state.jobBids[jobBidIndex] = action.payload;
        }
      });

    // Accept Bid
    builder
      .addCase(acceptBid.fulfilled, (state, action) => {
        const index = state.jobBids.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.jobBids[index] = action.payload;
        }
      });

    // Reject Bid
    builder
      .addCase(rejectBid.fulfilled, (state, action) => {
        const index = state.jobBids.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.jobBids[index] = action.payload;
        }
      });

    // Withdraw Bid
    builder
      .addCase(withdrawBid.fulfilled, (state, action) => {
        state.myBids = state.myBids.filter((b) => b.id !== action.payload.id);
        state.jobBids = state.jobBids.filter((b) => b.id !== action.payload.id);
      });

    // Delete Bid
    builder
      .addCase(deleteBid.fulfilled, (state, action) => {
        state.myBids = state.myBids.filter((b) => b.id !== action.payload);
        state.jobBids = state.jobBids.filter((b) => b.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentBid, clearJobBids } = bidSlice.actions;
export default bidSlice.reducer;

