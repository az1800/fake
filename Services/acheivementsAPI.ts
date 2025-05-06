import supabase from "./supabase";
export interface Achievement {
  id: number;
  title: string;
  description: string;
  date: string;
  image_url?: string;
  created_at?: string;
}

export interface FormData {
  title: string;
  description: string;
  date: string;
  image_url?: string;
}
export default async function getAcheivements() {
  let { data, error } = await supabase.from("achievements").select("*");
  if (error) {
  }
  return data;
}
const ACHIEVEMENTS_TABLE = "achievements";

// Fetch all achievements
export const fetchAchievements = async (): Promise<Achievement[]> => {
  try {
    const { data, error } = await supabase
      .from(ACHIEVEMENTS_TABLE)
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching achievements:", error);
    throw error;
  }
};

// Add a new achievement
export const addAchievement = async (
  formData: FormData
): Promise<Achievement> => {
  try {
    // If there's an image as base64 string, upload it to storage first
    let image_url = formData.image_url;

    if (image_url && image_url.startsWith("data:image")) {
      image_url = await uploadImage(image_url);
    }

    const achievementData = {
      title: formData.title,
      description: formData.description,
      date: formData.date,
      image_url: image_url,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(ACHIEVEMENTS_TABLE)
      .insert([achievementData])
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error("Error adding achievement:", error);
    throw error;
  }
};

// Update an existing achievement
export const updateAchievement = async (
  id: number,
  formData: FormData
): Promise<Achievement> => {
  try {
    // If there's a new image as base64 string, upload it to storage first
    let image_url = formData.image_url;

    if (image_url && image_url.startsWith("data:image")) {
      // Delete old image if exists
      const { data: oldAchievement } = await supabase
        .from(ACHIEVEMENTS_TABLE)
        .select("image_url")
        .eq("id", id)
        .single();

      if (oldAchievement?.image_url) {
        await deleteImage(oldAchievement.image_url);
      }

      // Upload new image
      image_url = await uploadImage(image_url);
    }

    const achievementData = {
      title: formData.title,
      description: formData.description,
      date: formData.date,
      image_url: image_url,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(ACHIEVEMENTS_TABLE)
      .update(achievementData)
      .eq("id", id)
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error("Error updating achievement:", error);
    throw error;
  }
};

// Delete an achievement
export const deleteAchievement = async (id: number): Promise<void> => {
  try {
    // Get the achievement to delete its image if exists
    const { data: achievement } = await supabase
      .from(ACHIEVEMENTS_TABLE)
      .select("image_url")
      .eq("id", id)
      .single();

    // Delete the achievement
    const { error } = await supabase
      .from(ACHIEVEMENTS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Delete associated image if exists
    if (achievement?.image_url) {
      await deleteImage(achievement.image_url);
    }
  } catch (error) {
    console.error("Error deleting achievement:", error);
    throw error;
  }
};

// Helper function to upload image to Supabase storage
async function uploadImage(base64Image: string): Promise<string> {
  try {
    // Extract file data and type from base64 string
    const [meta, data] = base64Image.split(",");
    const fileType = meta.split(":")[1].split(";")[0];
    const fileExt = fileType.split("/")[1];

    // Convert base64 to blob
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: fileType });

    // Generate a unique filename
    const fileName = `achievement_${Date.now()}.${fileExt}`;
    const filePath = `achievements/${fileName}`;

    // Upload to Supabase storage
    const { data: uploadedData, error } = await supabase.storage
      .from("media")
      .upload(filePath, blob, {
        contentType: fileType,
        cacheControl: "3600",
      });

    if (error) {
      throw error;
    }

    // Get public URL of the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

// Helper function to delete image from Supabase storage
async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    // This assumes the URL follows the pattern: https://[supabase-project].supabase.co/storage/v1/object/public/media/[filepath]
    const urlParts = imageUrl.split("/media/");
    if (urlParts.length < 2) return; // Not a valid Supabase storage URL

    const filePath = urlParts[1];

    // Delete the file
    const { error } = await supabase.storage.from("media").remove([filePath]);

    if (error) {
      console.error("Error deleting image from storage:", error);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

// Get a single achievement by ID
export const getAchievementById = async (
  id: number
): Promise<Achievement | null> => {
  try {
    const { data, error } = await supabase
      .from(ACHIEVEMENTS_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching achievement by ID:", error);
    return null;
  }
};
